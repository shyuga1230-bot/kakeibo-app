// 案件詳細の最新状態(状態・進捗・更新履歴)を返すAPI。
// 詳細ページは保存後・30秒ごと・タブ復帰時にこのAPIを読み直す(リアルタイム更新)。
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getProject, listLogs } from "@/lib/projects";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }
  const { id } = await params;
  const projectId = Number.parseInt(id, 10);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });
  }
  try {
    const [project, logs] = await Promise.all([getProject(projectId), listLogs(projectId)]);
    if (!project) {
      return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });
    }
    return NextResponse.json(
      {
        phase: project.phase,
        progress: project.progress,
        logs: logs.map((l) => ({
          id: l.id,
          action: l.action,
          by: l.changedBy,
          at: l.createdAt.toISOString(),
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("GET /api/projects/[id] failed:", e);
    return NextResponse.json(
      { error: "読み込みに失敗しました" },
      { status: 500 },
    );
  }
}
