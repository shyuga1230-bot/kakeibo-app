// 案件管理の工程・ステータスの定義と進捗計算(純粋ロジック)。
// 画面・サーバー処理・テストの全部から使うため、DBやNext.jsには依存しない。

/** 工程の定義。Excelの管理表の列(左から右)と同じ順番。 */
export const STAGES = [
  { key: "contractor_data", label: "受注者データ" },
  { key: "ark_estimate", label: "Ark見積" },
  { key: "estimate_proposal", label: "見積提案" },
  { key: "utilization_plan", label: "活用計画書" },
  { key: "engineer_meeting", label: "技術者打合せ" },
  { key: "government_estimate", label: "役所見積" },
  { key: "construction_plan", label: "施工計画書" },
  { key: "groundbreaking_survey", label: "起工測量" },
  { key: "survey_deliverable", label: "起工測量成果" },
  { key: "construction_data", label: "施工データ" },
  { key: "asbuilt_survey", label: "出来形測量" },
  { key: "icon_file", label: "ICONファイル" },
  { key: "after_follow", label: "完了後フォロー" },
] as const;

export type StageKey = (typeof STAGES)[number]["key"];

/** 工程の状態。セルの色分けもここで一元管理する。 */
export const STATUSES = [
  {
    key: "not_started",
    label: "未着手",
    // 一覧表のセルの色
    cellClass: "bg-white text-slate-300",
    // 凡例・バッジ用の点の色
    dotClass: "bg-slate-200",
    // ダッシュボードの積み上げバーの色
    barClass: "bg-slate-200",
  },
  {
    key: "in_progress",
    label: "進行中",
    cellClass: "bg-amber-100 text-amber-800",
    dotClass: "bg-amber-400",
    barClass: "bg-amber-500",
  },
  {
    key: "done",
    label: "完了",
    cellClass: "bg-green-100 text-green-800",
    dotClass: "bg-green-500",
    barClass: "bg-green-600",
  },
  {
    key: "not_applicable",
    label: "対象外",
    cellClass: "bg-slate-100 text-slate-400",
    dotClass: "bg-slate-400",
    barClass: "bg-slate-400",
  },
] as const;

export type StageStatus = (typeof STATUSES)[number]["key"];

const STAGE_KEY_SET = new Set<string>(STAGES.map((s) => s.key));
const STATUS_KEY_SET = new Set<string>(STATUSES.map((s) => s.key));

export function isStageKey(value: string): value is StageKey {
  return STAGE_KEY_SET.has(value);
}

export function isStageStatus(value: string): value is StageStatus {
  return STATUS_KEY_SET.has(value);
}

export function stageLabel(key: StageKey): string {
  return STAGES.find((s) => s.key === key)?.label ?? key;
}

export function statusDef(status: StageStatus) {
  return STATUSES.find((s) => s.key === status) ?? STATUSES[0];
}

/** 1案件分の工程の状態(行が無い工程は「未着手」扱い) */
export type StageStateMap = Partial<
  Record<StageKey, { status: StageStatus; date: string | null; memo: string | null }>
>;

export function stageState(
  map: StageStateMap,
  key: StageKey,
): { status: StageStatus; date: string | null; memo: string | null } {
  return map[key] ?? { status: "not_started", date: null, memo: null };
}

/**
 * 案件の進捗率。対象外を除いた工程のうち、完了した割合。
 * すべて対象外の場合は 0%(applicable=0)として返す。
 */
export function computeProgress(map: StageStateMap): {
  done: number;
  applicable: number;
  percent: number;
} {
  let done = 0;
  let applicable = 0;
  for (const stage of STAGES) {
    const s = stageState(map, stage.key).status;
    if (s === "not_applicable") continue;
    applicable += 1;
    if (s === "done") done += 1;
  }
  const percent = applicable === 0 ? 0 : Math.round((done / applicable) * 100);
  return { done, applicable, percent };
}

/**
 * 「いま止まっている工程」= 左から見て最初の未完了(対象外を除く)工程。
 * すべて完了(または対象外)なら null(=案件完了)。
 */
export function currentStageKey(map: StageStateMap): StageKey | null {
  for (const stage of STAGES) {
    const s = stageState(map, stage.key).status;
    if (s === "done" || s === "not_applicable") continue;
    return stage.key;
  }
  return null;
}

/** 案件全体の状態(一覧の絞り込みとダッシュボードの集計に使う) */
export type ProjectPhase = "not_started" | "in_progress" | "done";

export function projectPhase(map: StageStateMap): ProjectPhase {
  const { done, applicable } = computeProgress(map);
  if (applicable > 0 && done === applicable) return "done";
  const anyTouched = STAGES.some((stage) => {
    const s = stageState(map, stage.key).status;
    return s === "in_progress" || s === "done";
  });
  return anyTouched ? "in_progress" : "not_started";
}

export const PROJECT_PHASE_LABELS: Record<ProjectPhase, string> = {
  not_started: "未着手",
  in_progress: "進行中",
  done: "完了",
};
