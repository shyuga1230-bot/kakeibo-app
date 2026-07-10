"use server";
// 画面から呼ばれるサーバー処理(登録・編集・削除・まとめて取込・ログイン)。
// これらはフォーム経由でなくても直接呼び出せてしまうため、
// すべての処理の最初に必ずログイン確認を行う。

import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  clearSessionCookie,
  getSession,
  setSessionCookie,
} from "@/lib/session";
import { isAuthConfigured } from "@/lib/session-token";
import {
  normalizeItemName,
  parseAmount,
  parseBulkText,
  parseDate,
  type ImportRowError,
} from "@/lib/normalize";
import {
  createQuote,
  deleteQuote,
  getQuote,
  updateQuote,
  type QuoteInput,
} from "@/lib/quotes";
import {
  createMasterItem,
  deleteMasterItem,
  ensureMasterItems,
  importMasterItemsFromHistory,
  mergeItems,
  updateMasterItem,
} from "@/lib/items";
import { restoreProject, restoreQuote } from "@/lib/trash";
import { createMember, deleteMember, updateMember } from "@/lib/members";

/** 新しい商品を商品マスタへ自動追加(金額も標準金額として保存。失敗しても登録自体は成功扱い) */
async function addNewNamesToMaster(
  items: { itemName: string; amount: number | null }[],
): Promise<void> {
  try {
    await ensureMasterItems(items);
  } catch (e) {
    console.error("ensureMasterItems failed:", e);
  }
}

const LOGIN_ERROR_WAIT_MS = 800; // 失敗時の待ち時間(下のロックアウトと併用)

// ログイン失敗が続いた接続元を一時的にロックアウトする(総当たり対策)。
// サーバーのメモリ上で数えるだけの簡易な仕組みのため、サーバーが複数台の
// 構成では完全ではない。公開環境では強い(長くて推測されない)パスワードを使うこと。
const LOGIN_LOCK_MAX_FAILURES = 5;
const LOGIN_LOCK_MS = 60_000;
const loginFailures = new Map<string, { count: number; lockedUntil: number }>();

async function clientKey(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function safeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export type ImportResult =
  | {
      ok: true;
      imported: number;
      errors: ImportRowError[];
      /** エラーになった行の元テキスト(修正して再登録できるように返す) */
      failedText: string;
    }
  | { ok: false; error: string };

const NOT_LOGGED_IN_MESSAGE =
  "ログインが切れています。ページを再読み込みしてログインし直してください。";
const NOT_LOGGED_IN: ActionResult = { ok: false, error: NOT_LOGGED_IN_MESSAGE };

// ---------------------------------------------------------------------------
// ログイン / ログアウト
// ---------------------------------------------------------------------------

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!isAuthConfigured()) {
    return {
      ok: false,
      error:
        "サーバーにパスワードが設定されていません。管理者は環境変数 APP_PASSWORD を設定してください(README「初期設定」参照)。",
    };
  }
  const key = await clientKey();
  const now = Date.now();
  const record = loginFailures.get(key);
  if (record && record.lockedUntil > now) {
    return {
      ok: false,
      error:
        "ログインの失敗が続いたため、しばらく受け付けを停止しています。1分ほど待ってからもう一度お試しください。",
    };
  }

  const name = String(formData.get("user_name") ?? "")
    .replace(/[\s　]+/g, " ")
    .trim()
    .slice(0, 30);
  if (name === "") {
    return { ok: false, error: "お名前を入力してください。" };
  }

  const password = String(formData.get("password") ?? "");
  if (password === "" || !safeEquals(password, process.env.APP_PASSWORD ?? "")) {
    const count = (record?.count ?? 0) + 1;
    loginFailures.set(key, {
      count,
      lockedUntil: count >= LOGIN_LOCK_MAX_FAILURES ? now + LOGIN_LOCK_MS : 0,
    });
    await new Promise((r) => setTimeout(r, LOGIN_ERROR_WAIT_MS));
    return { ok: false, error: "パスワードが違います。もう一度入力してください。" };
  }
  loginFailures.delete(key);
  await setSessionCookie(name);
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}

// ---------------------------------------------------------------------------
// 見積もりの登録・編集・削除
// ---------------------------------------------------------------------------

/** フォームの入力内容を検証し、保存できる形に整える */
function validateQuoteForm(
  formData: FormData,
): { ok: true; input: QuoteInput } | { ok: false; error: string } {
  const dateResult = parseDate(String(formData.get("quote_date") ?? ""));
  if (!dateResult.value) {
    return { ok: false, error: dateResult.error ?? "日付を入力してください。" };
  }

  const customerRaw = String(formData.get("customer_name") ?? "").trim();
  if (customerRaw.length > 100) {
    return { ok: false, error: "顧客名が長すぎます(100文字まで)。" };
  }
  const memoRaw = String(formData.get("memo") ?? "").trim();
  if (memoRaw.length > 1000) {
    return { ok: false, error: "メモが長すぎます(1000文字まで)。" };
  }

  const names = formData.getAll("item_name").map((v) => normalizeItemName(String(v)));
  const amountsRaw = formData.getAll("item_amount").map((v) => String(v));

  const items: QuoteInput["items"] = [];
  for (let i = 0; i < names.length; i++) {
    const itemName = names[i];
    const amountRaw = amountsRaw[i] ?? "";
    // 名称も金額も空の行は「未入力の行」として無視する
    if (itemName === "" && amountRaw.trim() === "") continue;
    if (itemName === "") {
      return {
        ok: false,
        error: `${i + 1}行目の項目名が空です。金額だけの行は登録できません。`,
      };
    }
    if (itemName.length > 100) {
      return { ok: false, error: `項目名「${itemName}」が長すぎます(100文字まで)。` };
    }
    const amountResult = parseAmount(amountRaw);
    if (amountResult.error) {
      return { ok: false, error: `「${itemName}」の${amountResult.error}。` };
    }
    items.push({ itemName, amount: amountResult.value });
  }

  if (items.length === 0) {
    return { ok: false, error: "売れた項目を1つ以上入力してください。" };
  }
  const nameSet = new Set(items.map((i) => i.itemName));
  if (nameSet.size !== items.length) {
    return {
      ok: false,
      error:
        "同じ項目名が2回入力されています。1つの見積もりの中では同じ項目は1回だけ登録できます。",
    };
  }

  return {
    ok: true,
    input: {
      quoteDate: dateResult.value,
      customerName: customerRaw === "" ? null : customerRaw,
      memo: memoRaw === "" ? null : memoRaw,
      items,
    },
  };
}

export async function createQuoteAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return NOT_LOGGED_IN;

  const validated = validateQuoteForm(formData);
  if (!validated.ok) return validated;

  try {
    await createQuote(validated.input, session.name ?? null);
    await addNewNamesToMaster(validated.input.items);
  } catch (e) {
    console.error("createQuoteAction failed:", e);
    return {
      ok: false,
      error:
        "保存に失敗しました。少し待ってからもう一度お試しください。繰り返し失敗する場合は管理者に連絡してください。",
    };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "登録しました。続けて次の見積もりを入力できます。" };
}

export async function updateQuoteAction(
  quoteId: number,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await getSession())) return NOT_LOGGED_IN;
  if (!Number.isInteger(quoteId) || quoteId <= 0) {
    return { ok: false, error: "編集対象の見積もりが見つかりません。" };
  }

  const validated = validateQuoteForm(formData);
  if (!validated.ok) return validated;

  try {
    const existing = await getQuote(quoteId);
    if (!existing) {
      return {
        ok: false,
        error: "この見積もりはすでに削除されています。履歴を再読み込みしてください。",
      };
    }
    await updateQuote(quoteId, validated.input);
    await addNewNamesToMaster(validated.input.items);
  } catch (e) {
    console.error("updateQuoteAction failed:", e);
    return {
      ok: false,
      error:
        "保存に失敗しました。少し待ってからもう一度お試しください。繰り返し失敗する場合は管理者に連絡してください。",
    };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "変更を保存しました。" };
}

export async function deleteQuoteAction(quoteId: number): Promise<ActionResult> {
  if (!(await getSession())) return NOT_LOGGED_IN;
  if (!Number.isInteger(quoteId) || quoteId <= 0) {
    return { ok: false, error: "削除対象の見積もりが見つかりません。" };
  }
  try {
    const existing = await getQuote(quoteId);
    if (!existing) {
      return {
        ok: false,
        error: "この見積もりはすでに削除されています。履歴を再読み込みしてください。",
      };
    }
    await deleteQuote(quoteId);
  } catch (e) {
    console.error("deleteQuoteAction failed:", e);
    return {
      ok: false,
      error: "削除に失敗しました。少し待ってからもう一度お試しください。",
    };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "削除しました。" };
}

// ---------------------------------------------------------------------------
// まとめて登録(貼り付け取込)
// ---------------------------------------------------------------------------

const BULK_MAX_LINES = 1000;

export async function bulkImportAction(
  _prev: ImportResult | null,
  formData: FormData,
): Promise<ImportResult> {
  const session = await getSession();
  if (!session) {
    return { ok: false, error: NOT_LOGGED_IN_MESSAGE };
  }
  const text = String(formData.get("bulk_text") ?? "");
  if (text.trim() === "") {
    return { ok: false, error: "取り込む内容を貼り付けてください。" };
  }
  if (text.split("\n").length > BULK_MAX_LINES) {
    return {
      ok: false,
      error: `一度に取り込めるのは ${BULK_MAX_LINES} 行までです。分けて取り込んでください。`,
    };
  }

  const { rows, errors } = parseBulkText(text);
  let imported = 0;
  const importedItems: { itemName: string; amount: number | null }[] = [];
  const saveErrors: ImportRowError[] = [];

  // 正常な行だけを1行ずつ登録する(エラー行があっても他の行は登録する)
  for (const row of rows) {
    try {
      await createQuote(
        {
          quoteDate: row.date,
          customerName: row.customerName,
          memo: null,
          items: row.items,
        },
        session.name ?? null,
      );
      imported += 1;
      importedItems.push(...row.items);
    } catch (e) {
      console.error(`bulkImportAction: line ${row.line} failed:`, e);
      saveErrors.push({
        line: row.line,
        reason: "保存中にエラーが発生しました(この行だけ登録されていません)",
      });
    }
  }

  if (imported > 0) {
    await addNewNamesToMaster(importedItems);
    revalidatePath("/", "layout");
  }
  const allErrors = [...errors, ...saveErrors].sort((a, b) => a.line - b.line);

  // エラーになった行の元テキストを返し、画面側で「エラー行だけ」を残す。
  // こうすることで、修正して再登録しても成功済みの行が二重登録されない。
  const sourceLines = text.split(/\r\n|\r|\n/);
  const failedLineNumbers = new Set(allErrors.map((e) => e.line));
  const failedText = sourceLines
    .filter((_, i) => failedLineNumbers.has(i + 1))
    .join("\n");

  return { ok: true, imported, errors: allErrors, failedText };
}

// ---------------------------------------------------------------------------
// 社員名簿の管理
// ---------------------------------------------------------------------------

/** 社員名の入力チェック(登録・変更で共通) */
function validateMemberName(
  formData: FormData,
): { ok: true; name: string } | { ok: false; error: string } {
  const name = String(formData.get("name") ?? "")
    .replace(/[\s　]+/g, " ")
    .trim();
  if (name === "") return { ok: false, error: "名前を入力してください。" };
  if (name.length > 30) {
    return { ok: false, error: "名前が長すぎます(30文字まで)。" };
  }
  return { ok: true, name };
}

export async function createMemberAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await getSession())) return NOT_LOGGED_IN;
  const validated = validateMemberName(formData);
  if (!validated.ok) return validated;
  try {
    await createMember(validated.name);
  } catch (e) {
    if (isUniqueError(e)) {
      return { ok: false, error: `「${validated.name}」さんはすでに登録されています。` };
    }
    console.error("createMemberAction failed:", e);
    return { ok: false, error: "保存に失敗しました。もう一度お試しください。" };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: `「${validated.name}」さんを名簿に登録しました。` };
}

export async function updateMemberAction(
  memberId: number,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await getSession())) return NOT_LOGGED_IN;
  if (!Number.isInteger(memberId) || memberId <= 0) {
    return { ok: false, error: "編集対象が見つかりません。" };
  }
  const validated = validateMemberName(formData);
  if (!validated.ok) return validated;
  try {
    await updateMember(memberId, validated.name);
  } catch (e) {
    if (isUniqueError(e)) {
      return { ok: false, error: `「${validated.name}」さんはすでに登録されています。` };
    }
    console.error("updateMemberAction failed:", e);
    return {
      ok: false,
      error: "保存に失敗しました。この名前はすでに削除されている可能性があります。",
    };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "変更を保存しました。" };
}

export async function deleteMemberAction(memberId: number): Promise<ActionResult> {
  if (!(await getSession())) return NOT_LOGGED_IN;
  if (!Number.isInteger(memberId) || memberId <= 0) {
    return { ok: false, error: "削除対象が見つかりません。" };
  }
  try {
    await deleteMember(memberId);
  } catch (e) {
    console.error("deleteMemberAction failed:", e);
    return {
      ok: false,
      error: "削除に失敗しました。すでに削除されている可能性があります。",
    };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "名簿から削除しました(過去の記録の名前は残ります)。" };
}

// ---------------------------------------------------------------------------
// ごみ箱(削除した見積もり・案件を戻す)
// ---------------------------------------------------------------------------

export async function restoreQuoteAction(quoteId: number): Promise<ActionResult> {
  if (!(await getSession())) return NOT_LOGGED_IN;
  if (!Number.isInteger(quoteId) || quoteId <= 0) {
    return { ok: false, error: "対象の見積もりが見つかりません。" };
  }
  try {
    if (!(await restoreQuote(quoteId))) {
      return {
        ok: false,
        error: "この見積もりはすでに完全に削除されています(ごみ箱は30日で空になります)。",
      };
    }
  } catch (e) {
    console.error("restoreQuoteAction failed:", e);
    return { ok: false, error: "戻すのに失敗しました。もう一度お試しください。" };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "見積もりを履歴に戻しました。" };
}

export async function restoreProjectAction(projectId: number): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return NOT_LOGGED_IN;
  if (!Number.isInteger(projectId) || projectId <= 0) {
    return { ok: false, error: "対象の案件が見つかりません。" };
  }
  try {
    if (!(await restoreProject(projectId, session.name ?? null))) {
      return {
        ok: false,
        error: "この案件はすでに完全に削除されています(ごみ箱は30日で空になります)。",
      };
    }
  } catch (e) {
    console.error("restoreProjectAction failed:", e);
    return { ok: false, error: "戻すのに失敗しました。もう一度お試しください。" };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "案件を一覧に戻しました。" };
}

// ---------------------------------------------------------------------------
// 商品マスタの管理
// ---------------------------------------------------------------------------

/** 商品名と標準金額の入力チェック(登録・編集で共通) */
function validateMasterItemForm(
  formData: FormData,
): { ok: true; name: string; defaultAmount: number | null } | { ok: false; error: string } {
  const name = normalizeItemName(String(formData.get("name") ?? ""));
  if (name === "") return { ok: false, error: "商品名を入力してください。" };
  if (name.length > 100) {
    return { ok: false, error: "商品名が長すぎます(100文字まで)。" };
  }
  const amountResult = parseAmount(String(formData.get("default_amount") ?? ""));
  if (amountResult.error) {
    return { ok: false, error: `標準${amountResult.error}。` };
  }
  return { ok: true, name, defaultAmount: amountResult.value };
}

function isUniqueError(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";
}

export async function createMasterItemAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await getSession())) return NOT_LOGGED_IN;
  const validated = validateMasterItemForm(formData);
  if (!validated.ok) return validated;
  try {
    await createMasterItem(validated.name, validated.defaultAmount);
  } catch (e) {
    if (isUniqueError(e)) {
      return { ok: false, error: `「${validated.name}」はすでに登録されています。` };
    }
    console.error("createMasterItemAction failed:", e);
    return { ok: false, error: "保存に失敗しました。もう一度お試しください。" };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: `「${validated.name}」を商品に登録しました。` };
}

export async function updateMasterItemAction(
  itemId: number,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await getSession())) return NOT_LOGGED_IN;
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return { ok: false, error: "編集対象の商品が見つかりません。" };
  }
  const validated = validateMasterItemForm(formData);
  if (!validated.ok) return validated;
  try {
    await updateMasterItem(itemId, validated.name, validated.defaultAmount);
  } catch (e) {
    if (isUniqueError(e)) {
      return { ok: false, error: `「${validated.name}」はすでに登録されています。` };
    }
    console.error("updateMasterItemAction failed:", e);
    return {
      ok: false,
      error: "保存に失敗しました。この商品はすでに削除されている可能性があります。",
    };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "変更を保存しました。" };
}

export async function deleteMasterItemAction(itemId: number): Promise<ActionResult> {
  if (!(await getSession())) return NOT_LOGGED_IN;
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return { ok: false, error: "削除対象の商品が見つかりません。" };
  }
  try {
    await deleteMasterItem(itemId);
  } catch (e) {
    console.error("deleteMasterItemAction failed:", e);
    return {
      ok: false,
      error: "削除に失敗しました。この商品はすでに削除されている可能性があります。",
    };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "商品を削除しました。" };
}

/** 商品の統合(名寄せ)。fromName を toName にまとめ、過去の明細も書き換える */
export async function mergeItemsAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await getSession())) return NOT_LOGGED_IN;
  const fromName = normalizeItemName(String(formData.get("from_name") ?? ""));
  const toName = normalizeItemName(String(formData.get("to_name") ?? ""));
  if (fromName === "" || toName === "") {
    return { ok: false, error: "統合する商品と統合先の商品を選んでください。" };
  }
  if (fromName === toName) {
    return { ok: false, error: "同じ商品どうしは統合できません。" };
  }
  try {
    const changed = await mergeItems(fromName, toName);
    revalidatePath("/", "layout");
    return {
      ok: true,
      message:
        changed === 0
          ? `「${fromName}」を「${toName}」に統合しました(書き換える明細はありませんでした)。`
          : `「${fromName}」を「${toName}」に統合し、${changed}件の明細を書き換えました。`,
    };
  } catch (e) {
    console.error("mergeItemsAction failed:", e);
    return { ok: false, error: "統合に失敗しました。もう一度お試しください。" };
  }
}

export async function importMasterItemsAction(): Promise<ActionResult> {
  if (!(await getSession())) return NOT_LOGGED_IN;
  try {
    const count = await importMasterItemsFromHistory();
    revalidatePath("/", "layout");
    return {
      ok: true,
      message:
        count === 0
          ? "取り込める項目名はありませんでした(すべて登録済みです)。"
          : `過去の見積もりから ${count} 件の商品名を取り込みました。`,
    };
  } catch (e) {
    console.error("importMasterItemsAction failed:", e);
    return { ok: false, error: "取り込みに失敗しました。もう一度お試しください。" };
  }
}
