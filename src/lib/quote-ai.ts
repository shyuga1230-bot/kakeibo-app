// 見積書のAI読み取り(サーバー専用)。
// ルール読み取り(quote-sheet.ts)で読めない形の見積書を、Claude(Haiku)に
// 読んでもらって同じ ParsedQuoteSheet の形に直す。
// 費用を抑えるため:
//  - いちばん安いモデル(claude-haiku-4-5)を使う
//  - 空の行・列を落としてから送る(送る文字数=料金なので)
//  - 呼び出すのはルール読み取りで足りないときだけ(画面側で制御)
// ANTHROPIC_API_KEY が未設定の環境では使えない(画面にもボタンが出ない)。

import { z } from "zod";
import { parseAmount, parseDate } from "@/lib/normalize";
import {
  MAX_ITEMS,
  cleanItemName,
  isFeeItem,
  type ParseSheetResult,
  type ParsedQuoteSheet,
} from "@/lib/quote-sheet";
import type { SheetTsv } from "@/lib/xlsx-sheet";

/** AI読み取りが使える環境か(Vercelの環境変数 ANTHROPIC_API_KEY が必要) */
export function aiParseAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// モデルは環境変数で差し替えられるようにしておく(既定はいちばん安いHaiku)
const DEFAULT_MODEL = "claude-haiku-4-5";

// 送る量の上限。鑑シートは小さいので通常はここまで使わない
const MAX_LINES_PER_SHEET = 150;
const MAX_TOTAL_CHARS = 20_000;

/**
 * シートのタブ区切りテキストを、AIに送る用に小さくする。
 * 空行と行末の空セルを落とし、長すぎるシートは打ち切る。
 */
export function trimSheetsForAi(sheets: SheetTsv[]): {
  text: string;
  truncated: boolean;
} {
  const parts: string[] = [];
  let total = 0;
  let truncated = false;

  for (const sheet of sheets) {
    if (total >= MAX_TOTAL_CHARS) {
      truncated = true;
      break;
    }
    const lines: string[] = [];
    for (const line of sheet.tsv.split("\n")) {
      const cells = line.split("\t");
      while (cells.length > 0 && cells[cells.length - 1].trim() === "") {
        cells.pop();
      }
      if (cells.length === 0) continue; // 空行は送らない
      if (lines.length >= MAX_LINES_PER_SHEET) {
        lines.push("…(長いため以下省略)");
        truncated = true;
        break;
      }
      lines.push(cells.join("\t"));
    }
    if (lines.length === 0) continue;

    let part = `【シート: ${sheet.name}】\n${lines.join("\n")}`;
    if (total + part.length > MAX_TOTAL_CHARS) {
      part = part.slice(0, MAX_TOTAL_CHARS - total) + "\n…(長いため以下省略)";
      truncated = true;
    }
    parts.push(part);
    total += part.length;
  }

  return { text: parts.join("\n\n"), truncated };
}

// AIに返してもらうデータの形(この形しか返せないよう構造化出力で縛る)
const AiQuoteSchema = z.object({
  quoteDate: z.string().nullable(),
  customerName: z.string().nullable(),
  projectName: z.string().nullable(),
  items: z.array(
    z.object({
      itemName: z.string(),
      amount: z.number().nullable(),
    }),
  ),
  cautions: z.array(z.string()),
});
export type AiQuoteOutput = z.infer<typeof AiQuoteSchema>;

const SYSTEM_PROMPT = `あなたは建設会社の見積書(Excelをテキストにしたもの)から、登録用のデータを抜き出す係です。
複数のシートがある場合は、鑑(表紙)にあたるシートを優先して読み取ってください。
次のルールに従ってください。
- quoteDate: 見積書の発行日(見積日)を YYYY-MM-DD 形式で。有効期限・工期・納期の日付は使わない。見つからなければ null。
- customerName: 宛先の会社名。「御中」「様」は付けない。見つからなければ null。
- projectName: 工事名・件名。見つからなければ null。
- items: 明細の各行。itemName は項目名(行頭の①などの通し番号は外す)、amount はその行の金額(税抜・円・整数)。
  - 単価や数量ではなく、行の金額の列を使う。
  - 小計・中計・合計・消費税・総額の行は含めない。
  - 諸経費・現場管理費・一般管理費・法定福利費・安全衛生経費・値引きの行は含めない。
  - ※などの注記の行や【…】のような見出しの行は含めない。
  - 金額が書かれていない行は含めない。
- cautions: 読み取りに自信がない点や、確認してほしい点を日本語で短く(最大3件。なければ空の配列)。`;

/**
 * AIの返答を、ルール読み取りと同じ ParsedQuoteSheet に直す。
 * AIの指示違反(経費行・重複など)はここで拾って除外し、warnings で知らせる。
 */
export function toParsedQuoteSheet(out: AiQuoteOutput): ParseSheetResult {
  const warnings: string[] = [];

  let quoteDate: string | null = null;
  if (out.quoteDate) {
    quoteDate = parseDate(out.quoteDate).value;
  }
  if (!quoteDate) {
    warnings.push(
      "日付(発行日)を読み取れませんでした。フォームの日付を確認してください。",
    );
  }

  let customerName =
    out.customerName
      ?.replace(/[\s　]*(御中|様)$/, "")
      .replace(/[\s　]+/g, " ")
      .trim() ?? "";
  if (customerName === "") {
    warnings.push("顧客名(「◯◯ 御中」)を読み取れませんでした。");
  }

  const memo = out.projectName?.trim() || null;

  const items: ParsedQuoteSheet["items"] = [];
  const skippedFees: string[] = [];
  const seen = new Set<string>();
  for (const raw of out.items) {
    const itemName = cleanItemName(raw.itemName);
    if (itemName === "") continue;
    if (isFeeItem(itemName)) {
      skippedFees.push(itemName);
      continue;
    }
    if (seen.has(itemName)) {
      warnings.push(`「${itemName}」が2回以上出てきたため、2回目以降は読み飛ばしました。`);
      continue;
    }
    if (raw.amount == null || raw.amount <= 0) continue; // 金額なし・値引き行は登録しない
    // 金額の上限などのチェックはルール読み取りと同じ基準を使う
    const amountResult = parseAmount(String(Math.round(raw.amount)));
    if (amountResult.error) {
      warnings.push(`「${itemName}」の金額を読み取れなかったため、金額は空欄にしました。`);
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
        "AIでも登録できる明細行を見つけられませんでした。見積書の鑑(表紙)が入ったファイルか確認してください。",
    };
  }

  if (skippedFees.length > 0) {
    warnings.push(
      `経費などの行は読み飛ばしました: ${[...new Set(skippedFees)].join("、")}`,
    );
  }
  for (const caution of out.cautions.slice(0, 3)) {
    const c = caution.trim();
    if (c !== "") warnings.push(`AIより: ${c}`);
  }

  return {
    ok: true,
    data: {
      quoteDate,
      customerName: customerName || null,
      memo,
      items,
      warnings,
    },
  };
}

/** 見積書のシート一式をAIに読んでもらい、フォームに入れられる形にして返す */
export async function aiParseQuoteSheets(sheets: SheetTsv[]): Promise<ParseSheetResult> {
  if (!aiParseAvailable()) {
    return { ok: false, error: "AI読み取りはこの環境では設定されていません。" };
  }
  const { text, truncated } = trimSheetsForAi(sheets);
  if (text.trim() === "") {
    return { ok: false, error: "読み取れる内容がありません。" };
  }

  // SDKは使う瞬間に読み込む(通常の画面表示を重くしないため)
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const { zodOutputFormat } = await import("@anthropic-ai/sdk/helpers/zod");
  const client = new Anthropic({ maxRetries: 1, timeout: 45_000 });

  let parsed: AiQuoteOutput | null;
  try {
    const response = await client.messages.parse({
      model: process.env.QUOTE_AI_MODEL || DEFAULT_MODEL,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: text }],
      output_config: { format: zodOutputFormat(AiQuoteSchema) },
    });
    parsed = response.parsed_output;
  } catch (e) {
    console.error("AI quote parse failed:", e);
    return {
      ok: false,
      error: "AI読み取りに失敗しました。少し時間をおいてもう一度お試しください。",
    };
  }
  if (!parsed) {
    return {
      ok: false,
      error: "AIの答えを読み取れませんでした。もう一度お試しください。",
    };
  }

  const result = toParsedQuoteSheet(parsed);
  if (result.ok && truncated) {
    result.data.warnings.push(
      "ファイルが大きいため一部だけをAIに読ませています。項目に抜けがないか確認してください。",
    );
  }
  return result;
}
