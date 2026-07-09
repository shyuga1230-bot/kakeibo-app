// 協力会社への振分け計算のテスト。実行方法: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  activeCountByPartner,
  leastLoadedPartner,
  sortPartnersByLoad,
} from "../src/lib/assign";

const PARTNERS = [
  { id: 1, name: "青空測量" },
  { id: 2, name: "ひかりドローン" },
  { id: 3, name: "大地コンサル" },
];

test("activeCountByPartner: 完了していない案件だけを数える(未割り当てはnullキー)", () => {
  const counts = activeCountByPartner([
    { partnerName: "青空測量", phase: "in_progress" },
    { partnerName: "青空測量", phase: "not_started" },
    { partnerName: "青空測量", phase: "done" }, // 完了は数えない
    { partnerName: "ひかりドローン", phase: "in_progress" },
    { partnerName: null, phase: "not_started" },
    { partnerName: null, phase: "done" },
  ]);
  assert.equal(counts.get("青空測量"), 2);
  assert.equal(counts.get("ひかりドローン"), 1);
  assert.equal(counts.get("大地コンサル"), undefined); // 担当ゼロはキー自体なし
  assert.equal(counts.get(null), 1);
});

test("sortPartnersByLoad: 件数の少ない順、同数なら名前順", () => {
  const counts = new Map<string | null, number>([
    ["青空測量", 3],
    ["ひかりドローン", 1],
    // 大地コンサル は担当ゼロ
  ]);
  assert.deepEqual(
    sortPartnersByLoad(PARTNERS, counts).map((p) => p.name),
    ["大地コンサル", "ひかりドローン", "青空測量"],
  );

  // 全員同数なら名前順(日本語の並び)
  const even = new Map<string | null, number>();
  const names = sortPartnersByLoad(PARTNERS, even).map((p) => p.name);
  assert.deepEqual([...names].sort((a, b) => a.localeCompare(b, "ja")), names);
});

test("leastLoadedPartner: いちばん少ない会社を返す。マスタが空なら null", () => {
  const counts = new Map<string | null, number>([["青空測量", 2]]);
  const least = leastLoadedPartner(PARTNERS, counts);
  assert.ok(least && least.name !== "青空測量");
  assert.equal(leastLoadedPartner([], counts), null);
});
