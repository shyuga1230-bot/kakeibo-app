// 案件管理表のCSV出力用の行データ生成(純粋ロジック)。
// 1案件 = 1行。工程ごとに「状態」と「日付」の2列を出す。
import {
  PROJECT_PHASE_LABELS,
  STAGES,
  stageState,
  statusDef,
} from "@/lib/project-stages";
import type { BoardProject } from "@/lib/project-board";

export type ProjectCsvSource = BoardProject & {
  /** "YYYY-MM-DD" 形式(日本時間) */
  createdAt: string;
  updatedAt: string;
};

export function buildProjectCsvRows(
  projects: ProjectCsvSource[],
): (string | number | null)[][] {
  const header: (string | number | null)[] = [
    "案件ID",
    "協力会社",
    "社名",
    "案件名",
    "状態",
    "進捗率(%)",
    "完了工程数",
    "対象工程数",
  ];
  for (const stage of STAGES) {
    header.push(stage.label, `${stage.label}(日付)`);
  }
  header.push("備考", "登録日", "最終更新日");

  const rows: (string | number | null)[][] = [header];
  for (const p of projects) {
    const row: (string | number | null)[] = [
      p.id,
      p.partnerName,
      p.clientName,
      p.projectName,
      PROJECT_PHASE_LABELS[p.phase],
      p.progress.percent,
      p.progress.done,
      p.progress.applicable,
    ];
    for (const stage of STAGES) {
      const st = stageState(p.stages, stage.key);
      row.push(statusDef(st.status).label, st.date);
    }
    row.push(p.memo, p.createdAt, p.updatedAt);
    rows.push(row);
  }
  return rows;
}
