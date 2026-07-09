// 案件管理の一覧表データを返すAPI。
// 一覧表は30秒ごと・保存後・タブ復帰時にこのAPIを読み直す(リアルタイム更新)。
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listProjects } from "@/lib/projects";
import { toBoardProject } from "@/lib/project-board";

export async function GET() {
  if (!(await getSession())) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }
  try {
    const projects = await listProjects();
    return NextResponse.json(
      { projects: projects.map(toBoardProject) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("GET /api/projects/board failed:", e);
    return NextResponse.json(
      { error: "一覧の読み込みに失敗しました" },
      { status: 500 },
    );
  }
}
