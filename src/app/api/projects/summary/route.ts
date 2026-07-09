// ヘッダーに常時表示する案件管理のサマリー4項目を返すAPI。
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getProjectSummary } from "@/lib/projects";

export async function GET() {
  if (!(await getSession())) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }
  try {
    const summary = await getProjectSummary();
    return NextResponse.json(summary);
  } catch (e) {
    console.error("GET /api/projects/summary failed:", e);
    return NextResponse.json(
      { error: "集計に失敗しました" },
      { status: 500 },
    );
  }
}
