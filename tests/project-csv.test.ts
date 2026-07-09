// 案件管理表のCSV行生成のテスト。実行方法: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildProjectCsvRows, type ProjectCsvSource } from "../src/lib/project-csv";
import { STAGES } from "../src/lib/project-stages";

const base: ProjectCsvSource = {
  id: 1,
  partnerName: "○○測量",
  clientName: "山田建設",
  projectName: "△△地区道路改良工事",
  memo: "備考テスト",
  phase: "in_progress",
  progress: { done: 2, applicable: 12, percent: 17 },
  stages: {
    contractor_data: { status: "done", date: "2026-06-01", memo: null },
    ark_estimate: { status: "done", date: "2026-06-05", memo: null },
    estimate_proposal: { status: "in_progress", date: "2026-06-10", memo: null },
    government_estimate: { status: "not_applicable", date: null, memo: null },
  },
  createdAt: "2026-06-01",
  updatedAt: "2026-06-10",
};

test("buildProjectCsvRows: ヘッダーは基本8列+工程13×2列+末尾3列", () => {
  const rows = buildProjectCsvRows([]);
  assert.equal(rows.length, 1);
  const header = rows[0];
  assert.equal(header.length, 8 + STAGES.length * 2 + 3);
  assert.deepEqual(header.slice(0, 8), [
    "案件ID",
    "協力会社",
    "社名",
    "案件名",
    "状態",
    "進捗率(%)",
    "完了工程数",
    "対象工程数",
  ]);
  assert.equal(header[8], "受注者データ");
  assert.equal(header[9], "受注者データ(日付)");
  assert.deepEqual(header.slice(-3), ["備考", "登録日", "最終更新日"]);
});

test("buildProjectCsvRows: 工程の状態と日付が正しい列に入る", () => {
  const rows = buildProjectCsvRows([base]);
  assert.equal(rows.length, 2);
  const row = rows[1];
  assert.deepEqual(row.slice(0, 8), [
    1,
    "○○測量",
    "山田建設",
    "△△地区道路改良工事",
    "進行中",
    17,
    2,
    12,
  ]);
  // 受注者データ = 完了(2026-06-01)
  assert.equal(row[8], "完了");
  assert.equal(row[9], "2026-06-01");
  // 見積提案(3番目の工程) = 進行中
  assert.equal(row[8 + 2 * 2], "進行中");
  // 役所見積(6番目の工程) = 対象外・日付なし
  assert.equal(row[8 + 5 * 2], "対象外");
  assert.equal(row[8 + 5 * 2 + 1], null);
  // 状態が入っていない工程は未着手
  assert.equal(row[8 + 12 * 2], "未着手");
  assert.deepEqual(row.slice(-3), ["備考テスト", "2026-06-01", "2026-06-10"]);
});

test("buildProjectCsvRows: 社名・協力会社・備考が未入力(null)でもそのまま出せる", () => {
  const rows = buildProjectCsvRows([
    { ...base, partnerName: null, clientName: null, memo: null, phase: "not_started" },
  ]);
  const row = rows[1];
  assert.equal(row[1], null);
  assert.equal(row[2], null);
  assert.equal(row[4], "未着手");
});
