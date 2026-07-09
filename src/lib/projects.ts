// 案件管理データの読み書き(データアクセス層)。
// 認証チェックは呼び出し側(ページ・サーバー処理)で行う。
import "server-only";
import { getPrisma } from "@/lib/db";
import {
  STAGES,
  computeProgress,
  currentStageKey,
  isStageStatus,
  projectPhase,
  stageLabel,
  stageState,
  statusDef,
  type ProjectPhase,
  type StageKey,
  type StageStateMap,
  type StageStatus,
} from "@/lib/project-stages";

export type ProjectInput = {
  clientName: string | null;
  partnerName: string | null;
  projectName: string;
  memo: string | null;
};

export type StageInput = {
  status: StageStatus;
  date: string | null; // "YYYY-MM-DD"
  memo: string | null;
};

export type ProjectWithStages = {
  id: number;
  clientName: string | null;
  partnerName: string | null;
  projectName: string;
  memo: string | null;
  createdAt: Date;
  updatedAt: Date;
  stages: StageStateMap;
  /** 対象外を除いた工程のうち完了した割合 */
  progress: { done: number; applicable: number; percent: number };
  /** 案件全体の状態(未着手/進行中/完了) */
  phase: ProjectPhase;
  /** いま止まっている工程(全完了なら null) */
  currentStage: StageKey | null;
};

type StageRow = {
  stageKey: string;
  status: string;
  date: string | null;
  memo: string | null;
};

/** DBの工程行(存在する分だけ)を「工程キー → 状態」の形に変換する */
function toStageMap(rows: StageRow[]): StageStateMap {
  const map: StageStateMap = {};
  for (const row of rows) {
    const stage = STAGES.find((s) => s.key === row.stageKey);
    if (!stage) continue; // 定義から外れた工程キーは無視(将来の変更に備える)
    map[stage.key] = {
      status: isStageStatus(row.status) ? row.status : "not_started",
      date: row.date,
      memo: row.memo,
    };
  }
  return map;
}

function decorate(project: {
  id: number;
  clientName: string | null;
  partnerName: string | null;
  projectName: string;
  memo: string | null;
  createdAt: Date;
  updatedAt: Date;
  stages: StageRow[];
}): ProjectWithStages {
  const stages = toStageMap(project.stages);
  return {
    id: project.id,
    clientName: project.clientName,
    partnerName: project.partnerName,
    projectName: project.projectName,
    memo: project.memo,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    stages,
    progress: computeProgress(stages),
    phase: projectPhase(stages),
    currentStage: currentStageKey(stages),
  };
}

const stageSelect = {
  select: { stageKey: true, status: true, date: true, memo: true },
} as const;

/** 一覧表・ダッシュボード用: 全案件(新しい順) */
export async function listProjects(): Promise<ProjectWithStages[]> {
  const projects = await getPrisma().project.findMany({
    orderBy: { id: "desc" },
    include: { stages: stageSelect },
  });
  return projects.map(decorate);
}

export async function getProject(id: number): Promise<ProjectWithStages | null> {
  const project = await getPrisma().project.findUnique({
    where: { id },
    include: { stages: stageSelect },
  });
  return project ? decorate(project) : null;
}

export async function createProject(input: ProjectInput): Promise<number> {
  const project = await getPrisma().project.create({
    data: {
      clientName: input.clientName,
      partnerName: input.partnerName,
      projectName: input.projectName,
      memo: input.memo,
      logs: { create: { action: "案件を登録しました" } },
    },
    select: { id: true },
  });
  return project.id;
}

export async function updateProject(id: number, input: ProjectInput): Promise<void> {
  await getPrisma().project.update({
    where: { id },
    data: {
      clientName: input.clientName,
      partnerName: input.partnerName,
      projectName: input.projectName,
      memo: input.memo,
      logs: { create: { action: "基本情報(社名・協力会社・案件名・備考)を変更しました" } },
    },
  });
}

export async function deleteProject(id: number): Promise<void> {
  await getPrisma().project.delete({ where: { id } });
}

/** 工程1マスの状態を変更する(行が無ければ作る)。変更内容は履歴に残す。 */
export async function upsertStage(
  projectId: number,
  stageKey: StageKey,
  input: StageInput,
): Promise<void> {
  const label = stageLabel(stageKey);
  const statusLabel = statusDef(input.status).label;
  const action = input.date
    ? `「${label}」を「${statusLabel}」に変更しました(日付: ${input.date})`
    : `「${label}」を「${statusLabel}」に変更しました`;
  await getPrisma().$transaction([
    getPrisma().projectStage.upsert({
      where: { projectId_stageKey: { projectId, stageKey } },
      create: { projectId, stageKey, ...input },
      update: { ...input },
    }),
    // 案件の「最終更新」も動かす(CSVの「最終更新日」列に反映される)
    getPrisma().project.update({
      where: { id: projectId },
      data: { updatedAt: new Date(), logs: { create: { action } } },
    }),
  ]);
}

/** 詳細ページ用: 13工程まとめて保存(変わった工程だけ履歴に残す) */
export async function updateStages(
  projectId: number,
  inputs: Partial<Record<StageKey, StageInput>>,
): Promise<void> {
  const existing = await getPrisma().projectStage.findMany({
    where: { projectId },
    select: { stageKey: true, status: true, date: true, memo: true },
  });
  const current = toStageMap(existing);

  const ops = [];
  const changedActions: string[] = [];
  for (const stage of STAGES) {
    const input = inputs[stage.key];
    if (!input) continue;
    const before = stageState(current, stage.key);
    const changed =
      before.status !== input.status ||
      (before.date ?? null) !== (input.date ?? null) ||
      (before.memo ?? null) !== (input.memo ?? null);
    if (!changed) continue;
    ops.push(
      getPrisma().projectStage.upsert({
        where: { projectId_stageKey: { projectId, stageKey: stage.key } },
        create: { projectId, stageKey: stage.key, ...input },
        update: { ...input },
      }),
    );
    if (before.status !== input.status || (before.date ?? null) !== (input.date ?? null)) {
      changedActions.push(
        input.date
          ? `「${stage.label}」を「${statusDef(input.status).label}」に変更しました(日付: ${input.date})`
          : `「${stage.label}」を「${statusDef(input.status).label}」に変更しました`,
      );
    } else {
      changedActions.push(`「${stage.label}」のメモを変更しました`);
    }
  }
  if (ops.length === 0) return;
  ops.push(
    getPrisma().project.update({
      where: { id: projectId },
      data: {
        updatedAt: new Date(),
        logs: { create: changedActions.map((action) => ({ action })) },
      },
    }),
  );
  await getPrisma().$transaction(ops);
}

export type ProjectLogEntry = { id: number; action: string; createdAt: Date };

/** 詳細ページ用: 更新履歴(新しい順) */
export async function listLogs(projectId: number, limit = 30): Promise<ProjectLogEntry[]> {
  return await getPrisma().projectLog.findMany({
    where: { projectId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    select: { id: true, action: true, createdAt: true },
  });
}

export type ProjectSummary = {
  total: number;
  notStarted: number;
  inProgress: number;
  done: number;
};

/** ヘッダーのサマリー用: 案件数を状態別に数える */
export async function getProjectSummary(): Promise<ProjectSummary> {
  const projects = await listProjects();
  const summary: ProjectSummary = { total: projects.length, notStarted: 0, inProgress: 0, done: 0 };
  for (const p of projects) {
    if (p.phase === "done") summary.done += 1;
    else if (p.phase === "in_progress") summary.inProgress += 1;
    else summary.notStarted += 1;
  }
  return summary;
}

/** CSVエクスポート用: 全案件(登録の古い順) */
export async function loadAllProjectsForExport(): Promise<ProjectWithStages[]> {
  const projects = await getPrisma().project.findMany({
    orderBy: { id: "asc" },
    include: { stages: stageSelect },
  });
  return projects.map(decorate);
}
