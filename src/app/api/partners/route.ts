// 協力会社マスタの一覧を返すAPI。振分け画面と案件フォームのプルダウンが読む。
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listPartners } from "@/lib/partners";

export async function GET() {
  if (!(await getSession())) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }
  try {
    const partners = await listPartners();
    return NextResponse.json(
      { partners },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("GET /api/partners failed:", e);
    return NextResponse.json(
      { error: "協力会社の読み込みに失敗しました" },
      { status: 500 },
    );
  }
}
