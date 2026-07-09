// 案件管理表のCSVダウンロード。Excelで開いても文字化けしない形式(BOM付きUTF-8)。
// 1案件 = 1行(工程ごとに「状態」「日付」の2列)。
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { loadAllProjectsForExport } from "@/lib/projects";
import { buildProjectCsvRows } from "@/lib/project-csv";
import { buildCsv } from "@/lib/csv";
import { toJstDateString } from "@/lib/format";

export async function GET() {
  if (!(await getSession())) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }
  try {
    const projects = await loadAllProjectsForExport();
    const rows = buildProjectCsvRows(
      projects.map((p) => ({
        id: p.id,
        partnerName: p.partnerName,
        clientName: p.clientName,
        projectName: p.projectName,
        memo: p.memo,
        phase: p.phase,
        progress: p.progress,
        stages: p.stages,
        createdAt: toJstDateString(p.createdAt),
        updatedAt: toJstDateString(p.updatedAt),
      })),
    );
    const csv = buildCsv(rows);
    const today = toJstDateString(new Date());
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="projects_${today}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("GET /api/projects/export failed:", e);
    return NextResponse.json(
      { error: "CSVの作成に失敗しました" },
      { status: 500 },
    );
  }
}
