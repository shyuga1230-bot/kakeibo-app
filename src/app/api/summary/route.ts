// ヘッダーに常時表示するサマリー4項目を返すAPI。
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSummary } from "@/lib/quotes";

export async function GET() {
  if (!(await getSession())) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }
  try {
    const summary = await getSummary();
    return NextResponse.json(summary);
  } catch (e) {
    console.error("GET /api/summary failed:", e);
    return NextResponse.json(
      { error: "集計に失敗しました" },
      { status: 500 },
    );
  }
}
