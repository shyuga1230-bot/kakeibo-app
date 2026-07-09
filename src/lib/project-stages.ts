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

const STAGE_LABELS = new Map<string, string>(STAGES.map((s) => [s.key, s.label]));
const STATUS_DEFS = new Map<string, (typeof STATUSES)[number]>(
  STATUSES.map((s) => [s.key, s]),
);

export function isStageKey(value: string): value is StageKey {
  return STAGE_LABELS.has(value);
}

export function isStageStatus(value: string): value is StageStatus {
  return STATUS_DEFS.has(value);
}

export function stageLabel(key: StageKey): string {
  return STAGE_LABELS.get(key) ?? key;
}

export function statusDef(status: StageStatus) {
  return STATUS_DEFS.get(status) ?? STATUSES[0];
}

/** 工程1マス分の状態(状態・日付・メモ) */
export type StageState = {
  status: StageStatus;
  date: string | null;
  memo: string | null;
};

/** 1案件分の工程の状態(行が無い工程は「未着手」扱い) */
export type StageStateMap = Partial<Record<StageKey, StageState>>;

const NOT_STARTED: StageState = { status: "not_started", date: null, memo: null };

export function stageState(map: StageStateMap, key: StageKey): StageState {
  return map[key] ?? NOT_STARTED;
}

/** 工程1マス分の状態が同じかどうか(同時編集の検出と「変更された工程」の判定で共通) */
export function sameStageState(a: StageState, b: StageState): boolean {
  return (
    a.status === b.status &&
    (a.date ?? null) === (b.date ?? null) &&
    (a.memo ?? null) === (b.memo ?? null)
  );
}

/**
 * 状態を変えたときの日付の自動調整ルール(セルの編集・詳細ページで共通)。
 * 「進行中」「完了」にしたとき日付が空なら今日を入れ、
 * 「未着手」「対象外」に戻したら日付を消す。
 */
export function dateAfterStatusChange(
  next: StageStatus,
  currentDate: string,
  today: string,
): string {
  if ((next === "in_progress" || next === "done") && currentDate === "") return today;
  if (next === "not_started" || next === "not_applicable") return "";
  return currentDate;
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

/** 案件全体の状態の定義(ラベルとバッジの色もここで一元管理する) */
export const PROJECT_PHASES = [
  { key: "not_started", label: "未着手", chipClass: "bg-slate-100 text-slate-500" },
  { key: "in_progress", label: "進行中", chipClass: "bg-amber-100 text-amber-800" },
  { key: "done", label: "完了", chipClass: "bg-green-100 text-green-800" },
] as const satisfies readonly { key: ProjectPhase; label: string; chipClass: string }[];

export const PROJECT_PHASE_LABELS = Object.fromEntries(
  PROJECT_PHASES.map((p) => [p.key, p.label]),
) as Record<ProjectPhase, string>;

/** 案件を状態別に数える(ヘッダーのサマリー・一覧の絞り込み・ダッシュボードで共通) */
export function countByPhase(
  projects: readonly { phase: ProjectPhase }[],
): Record<ProjectPhase, number> {
  const counts: Record<ProjectPhase, number> = { not_started: 0, in_progress: 0, done: 0 };
  for (const p of projects) counts[p.phase] += 1;
  return counts;
}
