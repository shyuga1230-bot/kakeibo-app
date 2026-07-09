// 案件管理の進捗計算のテスト。実行方法: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  STAGES,
  STATUSES,
  computeProgress,
  currentStageKey,
  isStageKey,
  isStageStatus,
  projectPhase,
  stageState,
  type StageStateMap,
} from "../src/lib/project-stages";

function state(status: (typeof STATUSES)[number]["key"], date: string | null = null) {
  return { status, date, memo: null };
}

test("STAGES: Excelの管理表と同じ13工程が同じ順番で定義されている", () => {
  assert.deepEqual(
    STAGES.map((s) => s.label),
    [
      "受注者データ",
      "Ark見積",
      "見積提案",
      "活用計画書",
      "技術者打合せ",
      "役所見積",
      "施工計画書",
      "起工測量",
      "起工測量成果",
      "施工データ",
      "出来形測量",
      "ICONファイル",
      "完了後フォロー",
    ],
  );
});

test("isStageKey / isStageStatus: 不正な値を弾く", () => {
  assert.ok(isStageKey("ark_estimate"));
  assert.ok(!isStageKey("unknown_stage"));
  assert.ok(!isStageKey(""));
  assert.ok(isStageStatus("done"));
  assert.ok(!isStageStatus("finished"));
});

test("stageState: 行が無い工程は未着手として扱う", () => {
  const map: StageStateMap = { ark_estimate: state("done", "2026-07-01") };
  assert.equal(stageState(map, "ark_estimate").status, "done");
  assert.equal(stageState(map, "contractor_data").status, "not_started");
  assert.equal(stageState(map, "contractor_data").date, null);
});

test("computeProgress: 対象外を除いた完了割合を返す", () => {
  // 何も無い → 0 / 13
  assert.deepEqual(computeProgress({}), { done: 0, applicable: 13, percent: 0 });

  // 2完了・1対象外 → 2 / 12
  const map: StageStateMap = {
    contractor_data: state("done", "2026-06-01"),
    ark_estimate: state("done", "2026-06-05"),
    government_estimate: state("not_applicable"),
    estimate_proposal: state("in_progress"),
  };
  const p = computeProgress(map);
  assert.equal(p.done, 2);
  assert.equal(p.applicable, 12);
  assert.equal(p.percent, Math.round((2 / 12) * 100));
});

test("computeProgress: 全工程が対象外なら 0%(0除算しない)", () => {
  const map: StageStateMap = {};
  for (const s of STAGES) map[s.key] = state("not_applicable");
  assert.deepEqual(computeProgress(map), { done: 0, applicable: 0, percent: 0 });
});

test("currentStageKey: 左から最初の未完了工程(完了・対象外は飛ばす)", () => {
  assert.equal(currentStageKey({}), "contractor_data");

  const map: StageStateMap = {
    contractor_data: state("done"),
    ark_estimate: state("not_applicable"),
    estimate_proposal: state("in_progress"),
  };
  assert.equal(currentStageKey(map), "estimate_proposal");
});

test("currentStageKey: 全部完了(または対象外)なら null", () => {
  const map: StageStateMap = {};
  for (const s of STAGES) map[s.key] = state("done", "2026-07-01");
  map.government_estimate = state("not_applicable");
  assert.equal(currentStageKey(map), null);
});

test("projectPhase: 未着手 → 進行中 → 完了 の判定", () => {
  assert.equal(projectPhase({}), "not_started");

  // 対象外だけ付けても「未着手」のまま
  assert.equal(projectPhase({ government_estimate: state("not_applicable") }), "not_started");

  assert.equal(projectPhase({ contractor_data: state("in_progress") }), "in_progress");
  assert.equal(projectPhase({ contractor_data: state("done") }), "in_progress");

  const all: StageStateMap = {};
  for (const s of STAGES) all[s.key] = state("done");
  assert.equal(projectPhase(all), "done");

  // 全部対象外は「完了」ではなく「未着手」扱い
  const na: StageStateMap = {};
  for (const s of STAGES) na[s.key] = state("not_applicable");
  assert.equal(projectPhase(na), "not_started");
});
