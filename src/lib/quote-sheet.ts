// 見積書(Excelの「鑑」シート)を丸ごと貼り付けたテキストから、
// 日付・顧客名・工事名・明細(項目と金額)を読み取る処理。
// Excelからコピーした内容はタブ区切りで届くことを前提にしている。
// 画面とサーバーの両方から使えるよう、外部に依存しない純粋な関数にする。

import { normalizeItemName, parseAmount, parseDate } from "@/lib/normalize";

export type ParsedQuoteSheet = {
  /** "YYYY-MM-DD"。見つからなければ null(画面側で今日が入る) */
  quoteDate: string | null;
  customerName: string | null;
  /** 工事名・件名など。見つからなければ null */
  memo: string | null;
  items: { itemName: string; amount: number | null }[];
  /** ユーザーに確認してほしい点(読み飛ばした行など) */
  warnings: string[];
};

export type ParseSheetResult =
  | { ok: true; data: ParsedQuoteSheet }
  | { ok: false; error: string };

// 行頭の丸数字(①〜㊿)。見積書ごとの通し番号なので項目名からは外す
const CIRCLED_PREFIX = /^[\s　]*[①-⑳㉑-㉟㊱-㊿]+[\s　]*/;
// 経費・値引きなど、併売分析に入れない行
const FEE_ROW =
  /現場管理費|一般管理費|諸経費|法定福利費|安全衛生経費|間接測量費|直接測量費|間接費|直接費|出精値引|値引/;
// 合計などの締め行(ここで明細が終わり)。行内のどこかにあれば締めとみなす
const TOTAL_ROW = /合計|小計|総額|消費税|税抜|税込|御見積条件|見積価格|測量価格/;
// 項目名の列が「合計」などで始まる場合だけ締めとみなす
// (「数量合計表作成」のような、語を含むだけの項目名は締め扱いしない)
const TOTAL_NAME = /^(合計|総額|消費税|税抜|税込|御見積条件|見積価格|測量価格)/;
// 「小計」で始まる行は区切りの小計なので、終了せず読み飛ばして続きを読む
const SUBTOTAL_NAME = /^小計/;
// 見出し行(【…】)
const SECTION_ROW = /^[\s　]*【.*】?[\s　]*$/;

const MAX_ITEMS = 30;

/** セルの空白(全角含む)を除いた文字列。見出し判定用 */
function squash(cell: string): string {
  return cell.replace(/[\s　]/g, "");
}

/**
 * 行の中から日付として読めるセルを探す。
 * 「20260401」のような8桁の数字は見積番号のことがあるため、
 * まず「2026/4/7」「2026年4月7日」のような明示的な日付表記を優先し、
 * 見つからないときだけ8桁数字を日付として扱う。
 */
function findDateInRow(row: string[]): string | null {
  const isBareEightDigits = (s: string) => /^[0-9０-９]{8}$/.test(s);
  for (const allowBareDigits of [false, true]) {
    for (const cell of row) {
      const trimmed = cell.trim();
      if (trimmed === "" || /発行日|見積日|年月日/.test(trimmed)) continue;
      if (!allowBareDigits && isBareEightDigits(trimmed)) continue;
      const r = parseDate(trimmed);
      if (r.value) return r.value;
    }
  }
  return null;
}

export function parseQuoteSheet(text: string): ParseSheetResult {
  if (text.trim() === "") {
    return { ok: false, error: "見積書の内容を貼り付けてください。" };
  }
  const lines = text.split(/\r\n|\r|\n/);
  if (!lines.some((l) => l.includes("\t"))) {
    return {
      ok: false,
      error:
        "Excelからコピーした内容には見えません。Excelで見積書(鑑・表紙)のシート全体を選択してコピーし、そのまま貼り付けてください。",
    };
  }
  const rows = lines.map((l) => l.split("\t").map((c) => c.trim()));
  const warnings: string[] = [];

  // --- 日付(発行日・見積日) -------------------------------------------
  // 「有効期限」の日付を拾わないよう、ラベル付きの行だけを見る
  let quoteDate: string | null = null;
  for (const row of rows) {
    const joined = row.join("");
    if (/有効期限/.test(joined)) continue;
    if (/発行日|見積日|見積年月日/.test(joined)) {
      quoteDate = findDateInRow(row);
      if (quoteDate) break;
    }
  }
  if (!quoteDate) {
    warnings.push(
      "日付(発行日)を読み取れませんでした。フォームの日付を確認してください。",
    );
  }

  // --- 顧客名(「◯◯ 御中」「◯◯ 様」) ---------------------------------
  let customerName: string | null = null;
  const headArea = rows.slice(0, 15);
  outer: for (const row of headArea) {
    for (let i = 0; i < row.length; i++) {
      const cell = row[i];
      if (cell === "") continue;
      // 「◯◯ 御中」「◯◯様」が1つのセルに入っている場合
      const m = cell.match(/^(.{2,40}?)[\s　]*(御中|様)$/);
      if (m && m[1].trim() !== "") {
        customerName = m[1].replace(/[\s　]+/g, " ").trim();
        break outer;
      }
      // 「御中」「様」だけのセルの場合は、その左のセルが顧客名
      if ((cell === "御中" || cell === "様") && i > 0) {
        const left = row
          .slice(0, i)
          .reverse()
          .find((c) => c !== "");
        if (left) {
          customerName = left
            .replace(/[\s　]*(御中|様)$/, "")
            .replace(/[\s　]+/g, " ")
            .trim();
          break outer;
        }
      }
    }
  }
  if (!customerName) {
    warnings.push("顧客名(「◯◯ 御中」)を読み取れませんでした。");
  }

  // --- 工事名・件名(メモに入れる) --------------------------------------
  let memo: string | null = null;
  for (const row of headArea) {
    const joined = row.join("");
    if (/御中|様/.test(joined)) continue;
    for (const cell of row) {
      if (
        cell.length >= 8 &&
        /工事|業務|案件|件名/.test(cell) &&
        !/下記の通り|お見積り|御見積|申し上げ|支払|振込/.test(cell) &&
        !/^[・●※]/.test(cell)
      ) {
        memo = cell.trim();
        break;
      }
    }
    if (memo) break;
  }

  // --- 明細の見出し行を探す(「費目…」or「品名」+「金額」) --------------
  let headerIndex = -1;
  let nameCol = 0;
  let amountCol = -1;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const nameIdx = row.findIndex((c) => /費目|品名/.test(squash(c)));
    const amountIdx = row.findIndex((c) => squash(c) === "金額");
    if (nameIdx !== -1 && amountIdx !== -1) {
      headerIndex = i;
      nameCol = nameIdx;
      amountCol = amountIdx;
      break;
    }
  }
  if (headerIndex === -1) {
    return {
      ok: false,
      error:
        "明細の見出し行(「費目…」または「品名」と「金額」の行)が見つかりませんでした。見積書の表紙(鑑)のシート全体をコピーして貼り付けてください。",
    };
  }

  // --- 明細行を読み取る --------------------------------------------------
  const items: { itemName: string; amount: number | null }[] = [];
  const skippedFees: string[] = [];
  const seen = new Set<string>();
  let stoppedAt = -1; // 締め行で終了した位置(終了後の取りこぼし確認用)

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    const joined = row.join("");
    if (joined === "") continue;

    const rawName = row[nameCol] ?? "";
    const squashedName = squash(rawName);
    // 締め行(合計など)が来たら終了。「合　計」のような空白入りにも対応
    if (rawName === "" && TOTAL_ROW.test(squash(joined))) {
      stoppedAt = i;
      break;
    }
    if (rawName !== "" && TOTAL_NAME.test(squashedName)) {
      stoppedAt = i;
      break;
    }
    // 途中の「小計」は区切りなので読み飛ばして続きを読む
    if (rawName !== "" && SUBTOTAL_NAME.test(squashedName)) continue;
    if (rawName === "") continue;
    if (SECTION_ROW.test(rawName) && rawName.includes("【")) continue;

    const cleaned = rawName.replace(CIRCLED_PREFIX, "");
    const itemName = normalizeItemName(cleaned);
    if (itemName === "") continue;

    if (FEE_ROW.test(itemName)) {
      skippedFees.push(itemName);
      continue;
    }
    if (seen.has(itemName)) {
      warnings.push(
        `「${itemName}」が2回以上出てきたため、2回目以降は読み飛ばしました(内訳のシートを貼り付けていませんか?)。`,
      );
      continue;
    }

    const amountResult = parseAmount(row[amountCol] ?? "");
    if (amountResult.error) {
      warnings.push(
        `「${itemName}」の金額「${row[amountCol]}」を読み取れなかったため、金額は空欄にしました。`,
      );
    }
    seen.add(itemName);
    items.push({ itemName, amount: amountResult.error ? null : amountResult.value });

    if (items.length >= MAX_ITEMS) {
      warnings.push(`項目が多いため、${MAX_ITEMS}件まで読み取りました。`);
      break;
    }
  }

  if (items.length === 0) {
    return {
      ok: false,
      error:
        "登録できる明細行が見つかりませんでした(経費・合計の行は自動で除外されます)。見積書の表紙(鑑)のシート全体をコピーして貼り付けてください。",
    };
  }

  // 合計行より後に「項目名+金額」の形の行が残っていたら、取りこぼしの可能性を知らせる
  if (stoppedAt !== -1) {
    for (let i = stoppedAt + 1; i < rows.length; i++) {
      const row = rows[i];
      const name = normalizeItemName((row[nameCol] ?? "").replace(CIRCLED_PREFIX, ""));
      if (name === "" || TOTAL_NAME.test(squash(name)) || FEE_ROW.test(name)) continue;
      const amount = parseAmount(row[amountCol] ?? "");
      if (!amount.error && amount.value != null && amount.value > 0) {
        warnings.push(
          "合計行より後に明細らしき行があったため、そこまでは読み取っていません。フォームの項目数を見積書と見比べてください。",
        );
        break;
      }
    }
  }

  if (skippedFees.length > 0) {
    warnings.push(
      `経費などの行は読み飛ばしました: ${[...new Set(skippedFees)].join("、")}`,
    );
  }

  return {
    ok: true,
    data: { quoteDate, customerName, memo, items, warnings },
  };
}
