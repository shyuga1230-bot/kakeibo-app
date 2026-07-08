// 正規化処理のテスト。実行方法: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeItemName,
  parseAmount,
  parseDate,
  parseBulkText,
} from "../src/lib/normalize";

test("normalizeItemName: 前後の空白除去・全角→半角・連続空白をまとめる", () => {
  assert.equal(normalizeItemName("  3D起工測量  "), "3D起工測量");
  assert.equal(normalizeItemName("ICT建機　レンタル"), "ICT建機 レンタル");
  assert.equal(normalizeItemName("A　　B   C"), "A B C");
  assert.equal(normalizeItemName("　"), "");
});

test("parseAmount: 様々な表記を整数に正規化", () => {
  assert.deepEqual(parseAmount("1,200,000"), { value: 1200000 });
  assert.deepEqual(parseAmount("¥1200000"), { value: 1200000 });
  assert.deepEqual(parseAmount("１２００００"), { value: 120000 });
  assert.deepEqual(parseAmount("50万"), {
    value: null,
    error: '金額「50万」を数字として読み取れません',
  });
  assert.deepEqual(parseAmount("80000円"), { value: 80000 });
  assert.deepEqual(parseAmount(""), { value: null });
  assert.deepEqual(parseAmount("  "), { value: null });
  assert.deepEqual(parseAmount(null), { value: null });
  assert.equal(parseAmount("-100").error, "金額にマイナスは入力できません");
  assert.equal(parseAmount("abc").value, null);
  assert.ok(parseAmount("abc").error);
});

test("parseDate: 表記ゆれを YYYY-MM-DD に正規化", () => {
  assert.equal(parseDate("2026/6/1").value, "2026-06-01");
  assert.equal(parseDate("2026-06-01").value, "2026-06-01");
  assert.equal(parseDate("2026.6.1").value, "2026-06-01");
  assert.equal(parseDate("2026年6月1日").value, "2026-06-01");
  assert.equal(parseDate("20260601").value, "2026-06-01");
  assert.equal(parseDate("２０２６/６/１").value, "2026-06-01");
  assert.ok(parseDate("2026/2/30").error, "実在しない日付はエラー");
  assert.ok(parseDate("6/1").error, "年なしはエラー");
  assert.ok(parseDate("").error);
});

test("parseBulkText: 正常な行だけ取り込み、エラー行は行番号と理由を返す", () => {
  const text = [
    "2026/6/1, 山田建設, 3D起工測量/ICT建機レンタル, 500000/1200000", // OK
    "", // 空行はスキップ
    "2026-06-03, , 操作講習, 80000", // OK 顧客名なし
    "2026/13/1, 高橋土木, 3D起工測量", // 日付エラー
    "2026/6/5, 佐藤工務店, 3D起工測量/操作講習, 450000", // 金額の数が合わない
    "2026/6/6, 伊藤組, 3D起工測量/3D起工測量", // 項目重複
    "2026/6/7, 中村工業, 測量/講習/ソフト, 100//300", // OK 一部金額なし
  ].join("\n");

  const { rows, errors } = parseBulkText(text);
  assert.equal(rows.length, 3);
  assert.equal(errors.length, 3);

  assert.deepEqual(rows[0].items, [
    { itemName: "3D起工測量", amount: 500000 },
    { itemName: "ICT建機レンタル", amount: 1200000 },
  ]);
  assert.equal(rows[1].customerName, null);
  assert.deepEqual(rows[2].items, [
    { itemName: "測量", amount: 100 },
    { itemName: "講習", amount: null },
    { itemName: "ソフト", amount: 300 },
  ]);

  assert.deepEqual(
    errors.map((e) => e.line),
    [4, 5, 6],
  );
});

test("parseBulkText: タブ区切り(Excel貼り付け)も読める", () => {
  const { rows, errors } = parseBulkText("2026/6/1\t山田建設\t測量/講習\t100/200");
  assert.equal(errors.length, 0);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].items.length, 2);
});

test("parseBulkText: 列不足は行番号付きエラー", () => {
  const { rows, errors } = parseBulkText("2026/6/1, 山田建設");
  assert.equal(rows.length, 0);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].line, 1);
});

test("normalizeItemName: 全角英数字は半角に統一される(NFKC)", () => {
  assert.equal(normalizeItemName("３Ｄ起工測量"), "3D起工測量");
  assert.equal(normalizeItemName("ＩＣＴ建機レンタル"), "ICT建機レンタル");
});

test("parseAmount: データベースに保存できる上限(20億円)を超えるとエラー", () => {
  assert.deepEqual(parseAmount("2000000000"), { value: 2000000000 });
  assert.ok(parseAmount("3000000000").error);
  assert.ok(parseAmount("２，１４７，４８３，６４８円").error);
});

test("parseBulkText: 末尾の空列(Excelの貼り付けで発生)は無視される", () => {
  const { rows, errors } = parseBulkText("2026/6/1\t山田建設\t測量\t100\t\t");
  assert.equal(errors.length, 0);
  assert.equal(rows.length, 1);
});

test("parseBulkText: 全角スラッシュ「/」も区切りとして扱う", () => {
  const { rows, errors } = parseBulkText("2026/6/1, 山田建設, 測量／講習, 100／200");
  assert.equal(errors.length, 0);
  assert.deepEqual(rows[0].items, [
    { itemName: "測量", amount: 100 },
    { itemName: "講習", amount: 200 },
  ]);
});
