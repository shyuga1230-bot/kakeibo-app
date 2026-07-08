// 併売分析の計算テスト。実行方法: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeCoSales,
  computeItemStats,
  computePairs,
  computeSummary,
  type QuoteItems,
} from "../src/lib/analysis";

// テスト用データ:
//   案件1: A, B      案件2: A, B, C    案件3: A       案件4: B, C    案件5: A, C
const QUOTES: QuoteItems[] = [
  { quoteId: 1, itemNames: ["A", "B"], amounts: [100, 200] },
  { quoteId: 2, itemNames: ["A", "B", "C"], amounts: [100, null, 300] },
  { quoteId: 3, itemNames: ["A"], amounts: [null] },
  { quoteId: 4, itemNames: ["B", "C"], amounts: [200, 300] },
  { quoteId: 5, itemNames: ["A", "C"], amounts: [100, 300] },
];

test("computeCoSales: 併売率 = n / N(定義どおり)", () => {
  // A を含む案件: 1,2,3,5 → N=4。B も含む: 1,2 → n=2 (50%)。C も含む: 2,5 → n=2 (50%)
  const { N, rows } = computeCoSales(QUOTES, "A");
  assert.equal(N, 4);
  const b = rows.find((r) => r.itemName === "B")!;
  const c = rows.find((r) => r.itemName === "C")!;
  assert.equal(b.n, 2);
  assert.equal(b.rate, 0.5);
  assert.equal(c.n, 2);
  assert.equal(c.rate, 0.5);
});

test("computeCoSales: 1案件内の重複は1回と数える", () => {
  const quotes: QuoteItems[] = [
    { quoteId: 1, itemNames: ["A", "A", "B", "B"] }, // 重複あり
    { quoteId: 2, itemNames: ["A"] },
  ];
  const { N, rows } = computeCoSales(quotes, "A");
  assert.equal(N, 2);
  assert.deepEqual(rows, [{ itemName: "B", n: 1, rate: 0.5 }]);
});

test("computeCoSales: 存在しない項目は N=0", () => {
  const { N, rows } = computeCoSales(QUOTES, "Z");
  assert.equal(N, 0);
  assert.equal(rows.length, 0);
});

test("computePairs: 2回以上一緒に登場したペアだけ、回数の降順", () => {
  // A-B: 案件1,2 → 2回 / A-C: 案件2,5 → 2回 / B-C: 案件2,4 → 2回
  const pairs = computePairs(QUOTES, 2);
  assert.equal(pairs.length, 3);
  for (const p of pairs) assert.equal(p.count, 2);

  // 1回だけのペアは含まれない
  const single = computePairs(
    [{ quoteId: 1, itemNames: ["X", "Y"] }],
    2,
  );
  assert.equal(single.length, 0);
});

test("computePairs: 空白を含む項目名も正しくペアにできる", () => {
  const quotes: QuoteItems[] = [
    { quoteId: 1, itemNames: ["ICT建機 レンタル", "3D 起工測量"] },
    { quoteId: 2, itemNames: ["ICT建機 レンタル", "3D 起工測量"] },
  ];
  const pairs = computePairs(quotes, 2);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].count, 2);
  assert.ok(pairs[0].itemA.length > 0 && pairs[0].itemB.length > 0);
  assert.deepEqual(
    [pairs[0].itemA, pairs[0].itemB].sort(),
    ["3D 起工測量", "ICT建機 レンタル"].sort(),
  );
});

test("computeItemStats: 登場案件数の降順、金額は入力分のみ合計", () => {
  const stats = computeItemStats(QUOTES);
  // A: 4案件 300円 / B: 3案件 400円 / C: 3案件 900円
  assert.equal(stats[0].itemName, "A");
  assert.equal(stats[0].caseCount, 4);
  assert.equal(stats[0].amountSum, 300);
  // B と C は同数(3件)→ 金額合計の多い C が先
  assert.equal(stats[1].itemName, "C");
  assert.equal(stats[1].amountSum, 900);
  assert.equal(stats[2].itemName, "B");
  assert.equal(stats[2].amountSum, 400);
});

test("computeSummary: ヘッダーの4項目", () => {
  const s = computeSummary(QUOTES);
  assert.equal(s.quoteCount, 5);
  assert.equal(s.itemCount, 3);
  assert.equal(s.pairCount, 3);
  assert.equal(s.totalAmount, 100 + 200 + 100 + 300 + 200 + 300 + 100 + 300);
});

test("computeSummary: データ0件", () => {
  const s = computeSummary([]);
  assert.deepEqual(s, { quoteCount: 0, itemCount: 0, pairCount: 0, totalAmount: 0 });
});
