// 見積↔請求の比較計算(compare-calc.ts)のテスト。
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  changeRatePercent,
  diffItems,
  summarizePairs,
  type QuotePair,
} from "../src/lib/compare-calc";

// ---- diffItems ---------------------------------------------------------------

test("共通・追加・削除に分けられる", () => {
  const d = diffItems(
    [
      { name: "3D起工測量", amount: 500000 },
      { name: "点群処理", amount: 200000 },
    ],
    [
      { name: "3D起工測量", amount: 550000 },
      { name: "ICT建機レンタル", amount: 300000 },
    ],
  );
  assert.deepEqual(d.common, [
    { name: "3D起工測量", quoteAmount: 500000, invoiceAmount: 550000 },
  ]);
  assert.deepEqual(d.removed, [{ name: "点群処理", amount: 200000 }]);
  assert.equal(d.added.length, 1);
  assert.equal(d.added[0].name, "ICT建機レンタル");
  assert.equal(d.added[0].isFee, false);
});

test("表記ゆれ(全角・空白)があっても同じ項目として突き合わせる", () => {
  const d = diffItems(
    [{ name: "3D起工測量", amount: 500000 }],
    [{ name: "３Ｄ起工測量", amount: 500000 }],
  );
  assert.equal(d.common.length, 1);
  assert.equal(d.added.length, 0);
  assert.equal(d.removed.length, 0);
});

test("請求書に同じ項目が複数行あれば合算して比べる(分割請求)", () => {
  const d = diffItems(
    [{ name: "ICT建機レンタル", amount: 1200000 }],
    [
      { name: "ICT建機レンタル", amount: 600000 },
      { name: "ICT建機レンタル", amount: 600000 },
    ],
  );
  assert.deepEqual(d.common, [
    { name: "ICT建機レンタル", quoteAmount: 1200000, invoiceAmount: 1200000 },
  ]);
});

test("諸経費などの追加行には経費の印が付く", () => {
  const d = diffItems([], [{ name: "諸経費", amount: 90000 }]);
  assert.equal(d.added[0].isFee, true);
});

// ---- changeRatePercent ---------------------------------------------------------

test("増減率が計算できる(0円の見積もりはnull)", () => {
  const rate = changeRatePercent(1000000, 1150000);
  assert.ok(rate != null && Math.abs(rate - 15) < 1e-9);
  assert.equal(changeRatePercent(0, 100), null);
});

// ---- summarizePairs -------------------------------------------------------------

function pair(over: Partial<QuotePair>): QuotePair {
  return {
    quoteId: 1,
    quoteDate: "2026-07-01",
    customerName: "テスト建設",
    memo: null,
    quoteTotal: 1000,
    invoiceTotal: 1000,
    invoiceCount: 1,
    invoiceIds: [1],
    diff: { common: [], added: [], removed: [] },
    ...over,
  };
}

test("増額・減額・変わらずの件数と合計が集計される", () => {
  const s = summarizePairs([
    pair({ quoteId: 1, quoteTotal: 1000, invoiceTotal: 1200 }),
    pair({ quoteId: 2, quoteTotal: 1000, invoiceTotal: 800 }),
    pair({ quoteId: 3 }),
  ]);
  assert.equal(s.count, 3);
  assert.equal(s.quoteSum, 3000);
  assert.equal(s.invoiceSum, 3000);
  assert.equal(s.increased, 1);
  assert.equal(s.decreased, 1);
  assert.equal(s.unchanged, 1);
});

test("追加されやすい項目のランキングから経費は除かれる", () => {
  const s = summarizePairs([
    pair({
      quoteId: 1,
      diff: {
        common: [],
        added: [
          { name: "安全対策費", amount: 100, isFee: false },
          { name: "諸経費", amount: 900, isFee: true },
        ],
        removed: [],
      },
    }),
    pair({
      quoteId: 2,
      diff: {
        common: [],
        added: [{ name: "安全対策費", amount: 200, isFee: false }],
        removed: [],
      },
    }),
  ]);
  assert.deepEqual(s.addedRanking, [{ name: "安全対策費", count: 2, totalAmount: 300 }]);
});

test("顧客別は請求額の大きい順に並ぶ", () => {
  const s = summarizePairs([
    pair({ quoteId: 1, customerName: "A建設", invoiceTotal: 100 }),
    pair({ quoteId: 2, customerName: "B工務店", invoiceTotal: 900 }),
    pair({ quoteId: 3, customerName: "A建設", invoiceTotal: 200 }),
  ]);
  assert.equal(s.customers[0].name, "B工務店");
  assert.deepEqual(s.customers[1], { name: "A建設", count: 2, quoteSum: 2000, invoiceSum: 300 });
});
