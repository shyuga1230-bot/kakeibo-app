"use server";
// 案件管理のサーバー処理(案件の登録・編集・削除、工程の進捗変更)。
// フォーム経由でなくても直接呼び出せてしまうため、
// すべての処理の最初に必ずログイン確認を行う。

import { getSession } from "@/lib/session";
import { parseDate } from "@/lib/normalize";
import {
  STAGES,
  isStageKey,
  isStageStatus,
  stageLabel,
  stageState,
  type StageKey,
} from "@/lib/project-stages";
import {
  createProject,
  deleteProject,
  getProject,
  updateProject,
  updateStages,
  upsertStage,
  type ProjectInput,
  type StageInput,
} from "@/lib/projects";
import type { ActionResult } from "@/app/actions";

const NOT_LOGGED_IN: ActionResult = {
  ok: false,
  error: "ログインが切れています。ページを再読み込みしてログインし直してください。",
};

const SAVE_FAILED =
  "保存に失敗しました。少し待ってからもう一度お試しください。繰り返し失敗する場合は管理者に連絡してください。";

// ---------------------------------------------------------------------------
// 案件の登録・編集・削除
// ---------------------------------------------------------------------------

/** フォームの入力内容を検証し、保存できる形に整える */
function validateProjectForm(
  formData: FormData,
): { ok: true; input: ProjectInput } | { ok: false; error: string } {
  const projectName = String(formData.get("project_name") ?? "").trim();
  if (projectName === "") {
    return { ok: false, error: "案件名を入力してください。" };
  }
  if (projectName.length > 200) {
    return { ok: false, error: "案件名が長すぎます(200文字まで)。" };
  }
  const clientName = String(formData.get("client_name") ?? "").trim();
  if (clientName.length > 100) {
    return { ok: false, error: "社名が長すぎます(100文字まで)。" };
  }
  const partnerName = String(formData.get("partner_name") ?? "").trim();
  if (partnerName.length > 100) {
    return { ok: false, error: "協力会社が長すぎます(100文字まで)。" };
  }
  const memo = String(formData.get("memo") ?? "").trim();
  if (memo.length > 2000) {
    return { ok: false, error: "備考が長すぎます(2000文字まで)。" };
  }
  return {
    ok: true,
    input: {
      projectName,
      clientName: clientName === "" ? null : clientName,
      partnerName: partnerName === "" ? null : partnerName,
      memo: memo === "" ? null : memo,
    },
  };
}

export async function createProjectAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await getSession())) return NOT_LOGGED_IN;

  const validated = validateProjectForm(formData);
  if (!validated.ok) return validated;

  try {
    await createProject(validated.input);
  } catch (e) {
    console.error("createProjectAction failed:", e);
    return { ok: false, error: SAVE_FAILED };
  }
  return {
    ok: true,
    message: `案件「${validated.input.projectName}」を登録しました。一覧表のセルを押すと工程の進捗を入力できます。`,
  };
}

export async function updateProjectAction(
  projectId: number,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await getSession())) return NOT_LOGGED_IN;
  if (!Number.isInteger(projectId) || projectId <= 0) {
    return { ok: false, error: "編集対象の案件が見つかりません。" };
  }

  const validated = validateProjectForm(formData);
  if (!validated.ok) return validated;

  try {
    const existing = await getProject(projectId);
    if (!existing) {
      return {
        ok: false,
        error: "この案件はすでに削除されています。一覧を再読み込みしてください。",
      };
    }
    await updateProject(projectId, validated.input);
  } catch (e) {
    console.error("updateProjectAction failed:", e);
    return { ok: false, error: SAVE_FAILED };
  }
  return { ok: true, message: "基本情報を保存しました。" };
}

export async function deleteProjectAction(projectId: number): Promise<ActionResult> {
  if (!(await getSession())) return NOT_LOGGED_IN;
  if (!Number.isInteger(projectId) || projectId <= 0) {
    return { ok: false, error: "削除対象の案件が見つかりません。" };
  }
  try {
    const existing = await getProject(projectId);
    if (!existing) {
      return {
        ok: false,
        error: "この案件はすでに削除されています。一覧を再読み込みしてください。",
      };
    }
    await deleteProject(projectId);
  } catch (e) {
    console.error("deleteProjectAction failed:", e);
    return {
      ok: false,
      error: "削除に失敗しました。少し待ってからもう一度お試しください。",
    };
  }
  return { ok: true, message: "案件を削除しました。" };
}

// ---------------------------------------------------------------------------
// 工程の進捗変更
// ---------------------------------------------------------------------------

/** 工程1マス分の入力(状態・日付・メモ)を検証する */
function validateStageInput(
  statusRaw: string,
  dateRaw: string,
  memoRaw: string,
): { ok: true; input: StageInput } | { ok: false; error: string } {
  if (!isStageStatus(statusRaw)) {
    return { ok: false, error: "状態の値が正しくありません。画面を再読み込みしてください。" };
  }
  let date: string | null = null;
  if (dateRaw.trim() !== "") {
    const parsed = parseDate(dateRaw);
    if (!parsed.value) {
      return { ok: false, error: parsed.error ?? "日付を読み取れません。" };
    }
    date = parsed.value;
  }
  const memo = memoRaw.trim();
  if (memo.length > 500) {
    return { ok: false, error: "工程のメモが長すぎます(500文字まで)。" };
  }
  return {
    ok: true,
    input: { status: statusRaw, date, memo: memo === "" ? null : memo },
  };
}

export type StageUpdatePayload = {
  projectId: number;
  stageKey: string;
  status: string;
  /** "YYYY-MM-DD" または空文字(日付なし) */
  date: string;
  memo: string;
  /** ダイアログを開いた時点の値。他の人が先に変更していたら保存せずに知らせる */
  expected?: {
    status: string;
    date: string | null;
    memo: string | null;
  };
};

/** 一覧表のセルから呼ばれる: 工程1マスの状態を変更する */
export async function updateStageAction(
  payload: StageUpdatePayload,
): Promise<ActionResult> {
  if (!(await getSession())) return NOT_LOGGED_IN;

  const projectId = Number(payload.projectId);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    return { ok: false, error: "対象の案件が見つかりません。" };
  }
  const stageKeyRaw = String(payload.stageKey ?? "");
  if (!isStageKey(stageKeyRaw)) {
    return { ok: false, error: "工程の値が正しくありません。画面を再読み込みしてください。" };
  }
  const validated = validateStageInput(
    String(payload.status ?? ""),
    String(payload.date ?? ""),
    String(payload.memo ?? ""),
  );
  if (!validated.ok) return validated;

  try {
    const existing = await getProject(projectId);
    if (!existing) {
      return {
        ok: false,
        error: "この案件はすでに削除されています。一覧を再読み込みしてください。",
      };
    }
    // ダイアログを開いてから保存するまでの間に、他の人が同じマスを変更していないか確認する
    const expected = payload.expected;
    if (expected && typeof expected === "object") {
      const current = stageState(existing.stages, stageKeyRaw);
      const changedByOthers =
        current.status !== String(expected.status ?? "") ||
        (current.date ?? null) !== (expected.date ?? null) ||
        (current.memo ?? null) !== (expected.memo ?? null);
      if (changedByOthers) {
        return {
          ok: false,
          error:
            "このマスは、開いている間に他の人が変更しました。いったんキャンセルして最新の内容を確認してから、もう一度変更してください。",
        };
      }
    }
    await upsertStage(projectId, stageKeyRaw, validated.input);
  } catch (e) {
    console.error("updateStageAction failed:", e);
    return { ok: false, error: SAVE_FAILED };
  }
  return { ok: true, message: `「${stageLabel(stageKeyRaw)}」を更新しました。` };
}

/** 詳細ページから呼ばれる: 13工程の状態をまとめて保存する */
export async function updateStagesAction(
  projectId: number,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await getSession())) return NOT_LOGGED_IN;
  if (!Number.isInteger(projectId) || projectId <= 0) {
    return { ok: false, error: "編集対象の案件が見つかりません。" };
  }

  const inputs: Partial<Record<StageKey, StageInput>> = {};
  for (const stage of STAGES) {
    const statusRaw = formData.get(`stage_status_${stage.key}`);
    if (statusRaw == null) continue; // フォームに無い工程は変更しない

    // 画面を開いた時点の値(基準値)と同じ工程は「触っていない」ので保存しない。
    // こうすることで、他の人が同時に変えた工程を古い値で上書きしてしまわない。
    const baseStatus = formData.get(`stage_base_status_${stage.key}`);
    if (baseStatus != null) {
      const untouched =
        String(statusRaw) === String(baseStatus) &&
        String(formData.get(`stage_date_${stage.key}`) ?? "") ===
          String(formData.get(`stage_base_date_${stage.key}`) ?? "") &&
        String(formData.get(`stage_memo_${stage.key}`) ?? "") ===
          String(formData.get(`stage_base_memo_${stage.key}`) ?? "");
      if (untouched) continue;
    }

    const validated = validateStageInput(
      String(statusRaw),
      String(formData.get(`stage_date_${stage.key}`) ?? ""),
      String(formData.get(`stage_memo_${stage.key}`) ?? ""),
    );
    if (!validated.ok) {
      return { ok: false, error: `「${stage.label}」: ${validated.error}` };
    }
    inputs[stage.key] = validated.input;
  }

  try {
    const existing = await getProject(projectId);
    if (!existing) {
      return {
        ok: false,
        error: "この案件はすでに削除されています。一覧を再読み込みしてください。",
      };
    }
    await updateStages(projectId, inputs);
  } catch (e) {
    console.error("updateStagesAction failed:", e);
    return { ok: false, error: SAVE_FAILED };
  }
  return { ok: true, message: "工程の進捗を保存しました。" };
}
