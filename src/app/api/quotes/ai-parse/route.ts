// 見積書のAI読み取りAPI。画面から送られたシートのテキストをAIに読ませ、
// 登録フォームに入れられる形(ParsedQuoteSheet)で返す。
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { aiParseAvailable, aiParseQuoteSheets } from "@/lib/quote-ai";
import type { SheetTsv } from "@/lib/xlsx-sheet";

// AIの応答を待つため、既定より長めに実行できるようにする
export const maxDuration = 60;

// 巨大なファイルの誤送信対策(xlsx-sheet.ts の上限で通常ここまで来ない)
const MAX_TOTAL_CHARS = 2_000_000;

function parseBody(body: unknown): SheetTsv[] | null {
  if (typeof body !== "object" || body == null) return null;
  const sheets = (body as { sheets?: unknown }).sheets;
  if (!Array.isArray(sheets) || sheets.length === 0 || sheets.length > 20) return null;
  let total = 0;
  const result: SheetTsv[] = [];
  for (const s of sheets) {
    if (typeof s !== "object" || s == null) return null;
    const { name, tsv } = s as { name?: unknown; tsv?: unknown };
    if (typeof name !== "string" || typeof tsv !== "string") return null;
    total += tsv.length;
    if (total > MAX_TOTAL_CHARS) return null;
    result.push({ name: name.slice(0, 100), tsv });
  }
  return result;
}

export async function POST(req: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }
  if (!aiParseAvailable()) {
    return NextResponse.json(
      { error: "AI読み取りはこの環境では設定されていません。" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "送信内容を読み取れません" }, { status: 400 });
  }
  const sheets = parseBody(body);
  if (!sheets) {
    return NextResponse.json({ error: "送信内容を読み取れません" }, { status: 400 });
  }

  try {
    const result = await aiParseQuoteSheets(sheets);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }
    return NextResponse.json({ data: result.data });
  } catch (e) {
    console.error("POST /api/quotes/ai-parse failed:", e);
    return NextResponse.json(
      { error: "AI読み取りに失敗しました。少し時間をおいてもう一度お試しください。" },
      { status: 500 },
    );
  }
}
