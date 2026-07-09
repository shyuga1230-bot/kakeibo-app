// 月別売上集計のテスト。実行方法: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { availableYears, computeYearlySales } from "../src/lib/sales";
import { formatYenCompact } from "../src/lib/format";

const QUOTES = [
  { quoteDate: "2026-04-02", items: [
    { itemName: "3D起工測量", amount: 480000 },
    { itemName: "ICT建機レンタル", amount: 1200000 },
  ]},
  { quoteDate: "2026-04-20", items: [
    { itemName: "3D起工測量", amount: 500000 },
    { itemName: "操作講習", amount: null }, // 金額未入力
  ]},
  { quoteDate: "2026-06-01", items: [{ itemName: "操作講習", amount: 80000 }]},
  { quoteDate: "2025-12-31", items: [{ itemName: "ドローン空撮", amount: 150000 }]},
];

test("availableYears: データがある年を新しい順に返す", () => {
  assert.deepEqual(availableYears(QUOTES), [2026, 2025]);
  assert.deepEqual(availableYears([]), []);
});

test("computeYearlySales: 指定年の売上を月別に集計する(常に12ヶ月分)", () => {
  const sales = computeYearlySales(QUOTES, 2026);
  assert.equal(sales.length, 12);

  // 4月: 合計 = 480000 + 1200000 + 500000(nullは足さない)
  const april = sales[3];
  assert.equal(april.month, 4);
  assert.equal(april.total, 2180000);
  // ランキングは売上高の多い順。3D起工測量は2回登場で合計98万
  assert.deepEqual(
    april.items.map((i) => [i.itemName, i.amount, i.count]),
    [
      ["ICT建機レンタル", 1200000, 1],
      ["3D起工測量", 980000, 2],
      ["操作講習", 0, 1], // 金額未入力でも件数には出る
    ],
  );

  // 6月
  assert.equal(sales[5].total, 80000);
  // データのない月は空
  assert.equal(sales[0].total, 0);
  assert.equal(sales[0].items.length, 0);
  // 2025年のデータは含まれない
  assert.ok(!sales.some((m) => m.items.some((i) => i.itemName === "ドローン空撮")));
});

test("formatYenCompact: 万・億の概数表示", () => {
  assert.equal(formatYenCompact(9800), "9,800");
  assert.equal(formatYenCompact(480000), "48万");
  assert.equal(formatYenCompact(23208000), "2,321万");
  assert.equal(formatYenCompact(150000000), "1.5億");
  assert.equal(formatYenCompact(1230000000), "12億");
});
