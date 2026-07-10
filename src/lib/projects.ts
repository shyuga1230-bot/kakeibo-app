// 案件管理データの読み書き(データアクセス層)。
// 認証チェックは呼び出し側(ページ・サーバー処理)で行う。
import "server-only";
import { getPrisma } from "@/lib/db";
import {
  STAGES,
  computeProgress,
  countByPhase,
  currentStageKey,
  isStageKey,
  isStageStatus,
  projectPhase,
  sameStageState,
  stageLabel,
  stageState,
  statusDef,
  type ProjectPhase,
  type StageKey,
  type StageState,
  type StageStateMap,
} from "@/lib/project-stages";

export type ProjectInput = {
  clientName: string | null;
  partnerName: string | null;
  projectName: string;
  memo: string | null;
};

/** 工程1マス分の保存内容(状態・日付・メモ) */
export type StageInput = StageState;

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
    // 定義から外れた工程キー・状態は無視(将来の変更に備える)
    if (!isStageKey(row.stageKey)) continue;
    map[row.stageKey] = {
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

// ごみ箱に入っていない(削除されていない)案件だけを対象にする条件
const notDeleted = { deletedAt: null } as const;

/** 一覧表・ダッシュボード用は新しい順、CSV出力用は登録の古い順で全案件を読む */
export async function listProjects(order: "asc" | "desc" = "desc"): Promise<ProjectWithStages[]> {
  const projects = await getPrisma().project.findMany({
    where: notDeleted,
    orderBy: { id: order },
    include: { stages: stageSelect },
  });
  return projects.map(decorate);
}

export async function getProject(id: number): Promise<ProjectWithStages | null> {
  const project = await getPrisma().project.findFirst({
    where: { id, ...notDeleted },
    include: { stages: stageSelect },
  });
  return project ? decorate(project) : null;
}

/** 存在チェックだけ(編集・削除の前の確認用。工程まで読む必要がないとき) */
export async function projectExists(id: number): Promise<boolean> {
  const project = await getPrisma().project.findFirst({
    where: { id, ...notDeleted },
    select: { id: true },
  });
  return project !== null;
}

export async function createProject(
  input: ProjectInput,
  changedBy: string | null = null,
): Promise<number> {
  const project = await getPrisma().project.create({
    data: {
      clientName: input.clientName,
      partnerName: input.partnerName,
      projectName: input.projectName,
      memo: input.memo,
      logs: { create: { action: "案件を登録しました", changedBy } },
    },
    select: { id: true },
  });
  return project.id;
}

export async function updateProject(
  id: number,
  input: ProjectInput,
  changedBy: string | null = null,
): Promise<void> {
  await getPrisma().project.update({
    where: { id },
    data: {
      clientName: input.clientName,
      partnerName: input.partnerName,
      projectName: input.projectName,
      memo: input.memo,
      logs: {
        create: {
          action: "基本情報(社名・協力会社・案件名・備考)を変更しました",
          changedBy,
        },
      },
    },
  });
}

/** 削除 = ごみ箱へ移動(30日以内なら戻せる) */
export async function deleteProject(
  id: number,
  changedBy: string | null = null,
): Promise<void> {
  await getPrisma().project.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      logs: { create: { action: "案件をごみ箱に移動しました", changedBy } },
    },
  });
}

/** 振分け画面用: 協力会社だけを変更する(履歴に残す) */
export async function assignPartner(
  id: number,
  partnerName: string | null,
  changedBy: string | null = null,
): Promise<void> {
  await getPrisma().project.update({
    where: { id },
    data: {
      partnerName,
      logs: {
        create: {
          action: partnerName
            ? `協力会社を「${partnerName}」にしました`
            : "協力会社の割り当てを外しました",
          changedBy,
        },
      },
    },
  });
}

/** 更新履歴に残す文言(セルからの変更と、まとめて保存で共通) */
function stageChangeMessage(label: string, input: StageInput): string {
  const statusLabel = statusDef(input.status).label;
  return input.date
    ? `「${label}」を「${statusLabel}」に変更しました(日付: ${input.date})`
    : `「${label}」を「${statusLabel}」に変更しました`;
}

/** 工程1マスの状態を変更する(行が無ければ作る)。変更内容は履歴に残す。 */
export async function upsertStage(
  projectId: number,
  stageKey: StageKey,
  input: StageInput,
  changedBy: string | null = null,
): Promise<void> {
  await getPrisma().$transaction([
    getPrisma().projectStage.upsert({
      where: { projectId_stageKey: { projectId, stageKey } },
      create: { projectId, stageKey, ...input },
      update: { ...input },
    }),
    // 案件の「最終更新」も動かす(CSVの「最終更新日」列に反映される)
    getPrisma().project.update({
      where: { id: projectId },
      data: {
        updatedAt: new Date(),
        logs: {
          create: { action: stageChangeMessage(stageLabel(stageKey), input), changedBy },
        },
      },
    }),
  ]);
}

/**
 * 詳細ページ用: 複数工程をまとめて保存する(変わった工程だけ書き込み、履歴に残す)。
 * current には保存前の状態(呼び出し側が取得済みのもの)を渡す。
 */
export async function updateStages(
  projectId: number,
  inputs: Partial<Record<StageKey, StageInput>>,
  current: StageStateMap,
  changedBy: string | null = null,
): Promise<void> {
  const ops = [];
  const changedActions: string[] = [];
  for (const stage of STAGES) {
    const input = inputs[stage.key];
    if (!input) continue;
    const before = stageState(current, stage.key);
    if (sameStageState(before, input)) continue;
    ops.push(
      getPrisma().projectStage.upsert({
        where: { projectId_stageKey: { projectId, stageKey: stage.key } },
        create: { projectId, stageKey: stage.key, ...input },
        update: { ...input },
      }),
    );
    if (before.status !== input.status || (before.date ?? null) !== (input.date ?? null)) {
      changedActions.push(stageChangeMessage(stage.label, input));
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
        logs: { create: changedActions.map((action) => ({ action, changedBy })) },
      },
    }),
  );
  await getPrisma().$transaction(ops);
}

export type ProjectLogEntry = {
  id: number;
  action: string;
  changedBy: string | null;
  createdAt: Date;
};

/** 詳細ページ用: 更新履歴(新しい順) */
export async function listLogs(projectId: number, limit = 30): Promise<ProjectLogEntry[]> {
  return await getPrisma().projectLog.findMany({
    where: { projectId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    select: { id: true, action: true, changedBy: true, createdAt: true },
  });
}

export type ProjectSummary = {
  total: number;
  notStarted: number;
  inProgress: number;
  done: number;
};

/** ヘッダーのサマリー用: 案件数を状態別に数える(必要な列だけ読む軽い集計) */
export async function getProjectSummary(): Promise<ProjectSummary> {
  const projects = await getPrisma().project.findMany({
    where: notDeleted,
    select: { stages: { select: { stageKey: true, status: true } } },
  });
  const counts = countByPhase(
    projects.map((p) => ({
      phase: projectPhase(toStageMap(p.stages.map((s) => ({ ...s, date: null, memo: null })))),
    })),
  );
  return {
    total: projects.length,
    notStarted: counts.not_started,
    inProgress: counts.in_progress,
    done: counts.done,
  };
}
