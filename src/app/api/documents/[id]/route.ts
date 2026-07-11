// 書類(納品書・請求書)の保存・削除API。
// 編集画面から使うため、確実に結果が返るAPI方式にしている。
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { deleteDocument, updateDocument, type DocumentInput } from "@/lib/documents";
import { MAX_AMOUNT, type DocItemInput } from "@/lib/document-calc";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_ITEMS = 50;

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

/** 送られてきた保存内容を検査して、保存できる形にする。問題があればエラー文を返す */
function parseInput(body: unknown): DocumentInput | string {
  if (typeof body !== "object" || body == null) return "送信内容を読み取れません";
  const b = body as Record<string, unknown>;

  const str = (v: unknown, max: number): string | null =>
    typeof v === "string" && v.trim() !== "" ? v.trim().slice(0, max) : null;

  const docNumber = str(b.docNumber, 20);
  if (!docNumber) return "書類番号を入力してください";

  const issueDate = typeof b.issueDate === "string" && ISO_DATE.test(b.issueDate) ? b.issueDate : null;
  if (!issueDate) return "発行日を入力してください";

  const dueDate =
    typeof b.dueDate === "string" && ISO_DATE.test(b.dueDate) ? b.dueDate : null;

  const honorificRaw = typeof b.honorific === "string" ? b.honorific : "御中";
  const honorific = ["御中", "様", ""].includes(honorificRaw) ? honorificRaw : "御中";

  const taxRate =
    typeof b.taxRate === "number" && Number.isInteger(b.taxRate) && b.taxRate >= 0 && b.taxRate <= 100
      ? b.taxRate
      : null;
  if (taxRate == null) return "消費税率は0〜100の整数で入力してください";

  if (!Array.isArray(b.items)) return "明細を読み取れません";
  if (b.items.length > MAX_ITEMS) return `明細は${MAX_ITEMS}行までです`;
  const items: DocItemInput[] = [];
  for (const raw of b.items) {
    if (typeof raw !== "object" || raw == null) return "明細を読み取れません";
    const r = raw as Record<string, unknown>;
    const name = str(r.name, 200);
    if (!name) continue; // 品名が空の行は保存しない(画面の空行)
    const num = (v: unknown, max: number): number | null =>
      typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max ? v : null;
    const int = (v: unknown, max: number): number | null => {
      const n = num(v, max);
      return n == null ? null : Math.round(n);
    };
    items.push({
      name,
      quantity: num(r.quantity, 1_000_000),
      unit: str(r.unit, 20),
      unitPrice: int(r.unitPrice, MAX_AMOUNT),
      amount: int(r.amount, MAX_AMOUNT),
    });
  }
  if (items.length === 0) return "品名の入った明細を1行以上入れてください";

  return {
    docNumber,
    issueDate,
    dueDate,
    customerName: str(b.customerName, 100) ?? "",
    honorific,
    subject: str(b.subject, 200),
    note: str(b.note, 2000),
    taxRate,
    items,
  };
}

export async function PUT(req: Request, ctx: RouteContext<"/api/documents/[id]">) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }
  const { id: idRaw } = await ctx.params;
  const id = Number.parseInt(idRaw, 10);
  if (!Number.isInteger(id) || id <= 0) return badRequest("書類が見つかりません");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("送信内容を読み取れません");
  }
  const input = parseInput(body);
  if (typeof input === "string") return badRequest(input);

  try {
    const result = await updateDocument(id, input);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(`PUT /api/documents/${id} failed:`, e);
    return NextResponse.json(
      { error: "保存に失敗しました。もう一度お試しください。" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/documents/[id]">) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }
  const { id: idRaw } = await ctx.params;
  const id = Number.parseInt(idRaw, 10);
  if (!Number.isInteger(id) || id <= 0) return badRequest("書類が見つかりません");

  try {
    await deleteDocument(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(`DELETE /api/documents/${id} failed:`, e);
    return NextResponse.json(
      { error: "削除に失敗しました。もう一度お試しください。" },
      { status: 500 },
    );
  }
}
