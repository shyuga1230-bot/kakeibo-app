// 商品の「売れている度合い」判定のテスト。実行方法: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { salesLevel } from "../src/lib/item-level";

test("0件は「売上なし」", () => {
  assert.equal(salesLevel(0, 10).key, "none");
});

test("全商品が0件(max=0)でも「売上なし」", () => {
  assert.equal(salesLevel(0, 0).key, "none");
});

test("一番売れている商品の1/3未満は「少なめ」", () => {
  assert.equal(salesLevel(1, 10).key, "low");
  assert.equal(salesLevel(3, 10).key, "low"); // 0.3 < 1/3
});

test("1/3以上〜2/3未満は「ふつう」", () => {
  assert.equal(salesLevel(4, 10).key, "mid");
  assert.equal(salesLevel(6, 10).key, "mid");
});

test("2/3以上は「多め」", () => {
  assert.equal(salesLevel(7, 10).key, "high");
  assert.equal(salesLevel(10, 10).key, "high");
});

test("1件だけ売れている唯一の商品(max=1)は「多め」", () => {
  assert.equal(salesLevel(1, 1).key, "high");
});
