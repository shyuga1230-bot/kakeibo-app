// 納品書・請求書の計算(document-calc.ts)のテスト。
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  docTotals,
  endOfNextMonth,
  lineAmount,
  nextDocNumber,
} from "../src/lib/document-calc";

// ---- lineAmount ------------------------------------------------------------

test("単価があるときは 数量×単価(四捨五入)", () => {
  assert.equal(lineAmount({ quantity: 2, unitPrice: 1000, amount: null }), 2000);
  assert.equal(lineAmount({ quantity: 1.5, unitPrice: 333, amount: null }), 500); // 499.5 → 500
});

test("数量が空なら1として扱う", () => {
  assert.equal(lineAmount({ quantity: null, unitPrice: 500000, amount: null }), 500000);
});

test("単価が空なら手入力の金額をそのまま使う", () => {
  assert.equal(lineAmount({ quantity: 3, unitPrice: null, amount: 12345 }), 12345);
  assert.equal(lineAmount({ quantity: null, unitPrice: null, amount: null }), 0);
});

test("金額は上限(20億)で頭打ちになる", () => {
  assert.equal(
    lineAmount({ quantity: 1000, unitPrice: 2_000_000_000, amount: null }),
    2_000_000_000,
  );
});

// ---- docTotals -------------------------------------------------------------

test("小計・消費税(切り捨て)・合計が計算できる", () => {
  const totals = docTotals(
    [
      { quantity: 1, unitPrice: 500000, amount: null },
      { quantity: null, unitPrice: null, amount: 123456 },
    ],
    10,
  );
  assert.equal(totals.subtotal, 623456);
  assert.equal(totals.tax, 62345); // 62345.6 → 切り捨て
  assert.equal(totals.total, 685801);
});

test("明細が空なら全部0", () => {
  assert.deepEqual(docTotals([], 10), { subtotal: 0, tax: 0, total: 0 });
});

// ---- nextDocNumber ---------------------------------------------------------

test("最初の書類番号は YYYY-0001", () => {
  assert.equal(nextDocNumber(null, 2026), "2026-0001");
});

test("同じ年なら連番が進む", () => {
  assert.equal(nextDocNumber("2026-0012", 2026), "2026-0013");
});

test("年が変わると 0001 から数え直す", () => {
  assert.equal(nextDocNumber("2025-0099", 2026), "2026-0001");
});

test("手で変えた変な番号でも壊れない(数え直す)", () => {
  assert.equal(nextDocNumber("メモ-abc", 2026), "2026-0001");
});

// ---- endOfNextMonth --------------------------------------------------------

test("支払期限の初期値は発行月の翌月末", () => {
  assert.equal(endOfNextMonth("2026-07-11"), "2026-08-31");
  assert.equal(endOfNextMonth("2026-01-15"), "2026-02-28");
  assert.equal(endOfNextMonth("2026-12-01"), "2027-01-31");
});

test("うるう年の2月末も正しい", () => {
  assert.equal(endOfNextMonth("2028-01-05"), "2028-02-29");
});
