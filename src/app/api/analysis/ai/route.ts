// AI分析(質問に集計データを根拠として答える)のAPI。
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  analysisAiAvailable,
  answerAnalysisQuestion,
  type ChatMessage,
} from "@/lib/ai-analysis";

// AIの回答を待つため、既定より長めに実行できるようにする
export const maxDuration = 60;

const MAX_MESSAGES = 12;
const MAX_CHARS = 4000;

function parseMessages(body: unknown): ChatMessage[] | null {
  if (typeof body !== "object" || body == null) return null;
  const raw = (body as { messages?: unknown }).messages;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_MESSAGES) return null;
  const messages: ChatMessage[] = [];
  for (const m of raw) {
    if (typeof m !== "object" || m == null) return null;
    const { role, content } = m as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string" || content.trim() === "" || content.length > MAX_CHARS) {
      return null;
    }
    messages.push({ role, content });
  }
  if (messages[messages.length - 1].role !== "user") return null;
  // APIは「最初のメッセージは質問(user)」を要求する。画面側でも揃えているが、
  // 万一崩れていても答えられるよう、先頭の答え(assistant)は読み飛ばす
  while (messages.length > 0 && messages[0].role !== "user") messages.shift();
  if (messages.length === 0) return null;
  return messages;
}

export async function POST(req: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }
  if (!analysisAiAvailable()) {
    return NextResponse.json(
      { error: "AI分析はこの環境では設定されていません。" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "送信内容を読み取れません" }, { status: 400 });
  }
  const messages = parseMessages(body);
  if (!messages) {
    return NextResponse.json({ error: "質問を読み取れません" }, { status: 400 });
  }

  try {
    const result = await answerAnalysisQuestion(messages);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }
    return NextResponse.json({ text: result.text });
  } catch (e) {
    console.error("POST /api/analysis/ai failed:", e);
    return NextResponse.json(
      { error: "AI分析に失敗しました。少し時間をおいてもう一度お試しください。" },
      { status: 500 },
    );
  }
}
