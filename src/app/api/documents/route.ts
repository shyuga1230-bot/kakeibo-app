// 書類(納品書・請求書)を新しく作るAPI。
// 作成後は編集ページに移動するため、確実に結果が返るAPI方式にしている。
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createDocument } from "@/lib/documents";
import { isDocType } from "@/lib/document-calc";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "送信内容を読み取れません" }, { status: 400 });
  }
  const { type, quoteId, copyFromId } = (body ?? {}) as {
    type?: unknown;
    quoteId?: unknown;
    copyFromId?: unknown;
  };
  if (!isDocType(type)) {
    return NextResponse.json({ error: "書類の種類が正しくありません" }, { status: 400 });
  }
  const toId = (v: unknown): number | undefined =>
    typeof v === "number" && Number.isInteger(v) && v > 0 ? v : undefined;

  try {
    const result = await createDocument(
      type,
      { quoteId: toId(quoteId), copyFromId: toId(copyFromId) },
      session.name ?? null,
    );
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }
    return NextResponse.json({ id: result.id });
  } catch (e) {
    console.error("POST /api/documents failed:", e);
    return NextResponse.json(
      { error: "書類を作成できませんでした。もう一度お試しください。" },
      { status: 500 },
    );
  }
}
