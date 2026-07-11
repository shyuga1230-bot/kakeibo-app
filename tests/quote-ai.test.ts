// 見積書のAI読み取り(quote-ai.ts)の、AIを呼ばない純粋な部分のテスト。
// - trimSheetsForAi: AIに送るテキストの圧縮(送る文字数=料金なので重要)
// - toParsedQuoteSheet: AIの答えをフォーム用データに直す(指示違反の除外も)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  toParsedQuoteSheet,
  trimSheetsForAi,
  type AiQuoteOutput,
} from "../src/lib/quote-ai";

// ---- trimSheetsForAi -------------------------------------------------------

test("空行と行末の空セルを落として小さくする", () => {
  const { text, truncated } = trimSheetsForAi([
    {
      name: "鑑",
      tsv: "御見積書\t\t\t\n\t\t\t\nA工事\t100\t\t\n\t\t\t",
    },
  ]);
  assert.equal(text, "【シート: 鑑】\n御見積書\nA工事\t100");
  assert.equal(truncated, false);
});

test("シートが複数あればシート名付きで全部つなぐ", () => {
  const { text } = trimSheetsForAi([
    { name: "鑑", tsv: "御見積書\t" },
    { name: "内訳", tsv: "測量\t50000" },
  ]);
  assert.ok(text.includes("【シート: 鑑】"));
  assert.ok(text.includes("【シート: 内訳】"));
  assert.ok(text.includes("測量\t50000"));
});

test("長すぎるシートは打ち切って truncated を返す", () => {
  const longTsv = Array.from({ length: 400 }, (_, i) => `項目${i}\t100`).join("\n");
  const { text, truncated } = trimSheetsForAi([{ name: "内訳", tsv: longTsv }]);
  assert.equal(truncated, true);
  assert.ok(text.includes("…(長いため以下省略)"));
  assert.ok(text.length < longTsv.length);
});

// ---- toParsedQuoteSheet ----------------------------------------------------

const baseOutput: AiQuoteOutput = {
  quoteDate: "2026-07-01",
  customerName: "テスト建設",
  projectName: "○○地区 造成工事",
  items: [
    { itemName: "3D起工測量", amount: 500000 },
    { itemName: "ICT建機レンタル", amount: 1200000 },
  ],
  cautions: [],
};

test("AIの答えがそのままフォーム用データになる", () => {
  const r = toParsedQuoteSheet(baseOutput);
  assert.ok(r.ok);
  assert.equal(r.data.quoteDate, "2026-07-01");
  assert.equal(r.data.customerName, "テスト建設");
  assert.equal(r.data.memo, "○○地区 造成工事");
  assert.deepEqual(r.data.items, [
    { itemName: "3D起工測量", amount: 500000 },
    { itemName: "ICT建機レンタル", amount: 1200000 },
  ]);
  assert.equal(r.data.warnings.length, 0);
});

test("「御中」付きの顧客名や丸数字付きの項目名は掃除される", () => {
  const r = toParsedQuoteSheet({
    ...baseOutput,
    customerName: "テスト建設 御中",
    items: [{ itemName: "① ３Ｄ起工測量", amount: 500000 }],
  });
  assert.ok(r.ok);
  assert.equal(r.data.customerName, "テスト建設");
  assert.equal(r.data.items[0].itemName, "3D起工測量");
});

test("AIが指示に反して入れた経費行・重複行・金額なし行は除外する", () => {
  const r = toParsedQuoteSheet({
    ...baseOutput,
    items: [
      { itemName: "3D起工測量", amount: 500000 },
      { itemName: "諸経費", amount: 90000 },
      { itemName: "3D起工測量", amount: 500000 },
      { itemName: "検討中の項目", amount: null },
      { itemName: "出精値引", amount: -10000 },
    ],
  });
  assert.ok(r.ok);
  assert.deepEqual(r.data.items, [{ itemName: "3D起工測量", amount: 500000 }]);
  assert.ok(r.data.warnings.some((w) => w.includes("諸経費")));
  assert.ok(r.data.warnings.some((w) => w.includes("2回以上")));
});

test("日付や顧客名が読めなかったときは注意書きが付く", () => {
  const r = toParsedQuoteSheet({
    ...baseOutput,
    quoteDate: null,
    customerName: null,
  });
  assert.ok(r.ok);
  assert.equal(r.data.quoteDate, null);
  assert.equal(r.data.customerName, null);
  assert.ok(r.data.warnings.some((w) => w.includes("日付")));
  assert.ok(r.data.warnings.some((w) => w.includes("顧客名")));
});

test("でたらめな日付は捨てて注意書きにする", () => {
  const r = toParsedQuoteSheet({ ...baseOutput, quoteDate: "2026-02-30" });
  assert.ok(r.ok);
  assert.equal(r.data.quoteDate, null);
  assert.ok(r.data.warnings.some((w) => w.includes("日付")));
});

test("大きすぎる金額は空欄にして注意書きにする", () => {
  const r = toParsedQuoteSheet({
    ...baseOutput,
    items: [{ itemName: "巨大工事", amount: 9_000_000_000 }],
  });
  assert.ok(r.ok);
  assert.equal(r.data.items[0].amount, null);
  assert.ok(r.data.warnings.some((w) => w.includes("金額")));
});

test("AIからの注意(cautions)は最大3件までwarningsに入る", () => {
  const r = toParsedQuoteSheet({
    ...baseOutput,
    cautions: ["注意1", "注意2", "注意3", "注意4"],
  });
  assert.ok(r.ok);
  const aiWarnings = r.data.warnings.filter((w) => w.startsWith("AIより:"));
  assert.equal(aiWarnings.length, 3);
});

test("登録できる項目が1つもなければ失敗として返す", () => {
  const r = toParsedQuoteSheet({
    ...baseOutput,
    items: [{ itemName: "諸経費", amount: 90000 }],
  });
  assert.equal(r.ok, false);
});

test("項目は30件で打ち切る", () => {
  const r = toParsedQuoteSheet({
    ...baseOutput,
    items: Array.from({ length: 40 }, (_, i) => ({
      itemName: `項目${i + 1}`,
      amount: 1000,
    })),
  });
  assert.ok(r.ok);
  assert.equal(r.data.items.length, 30);
  assert.ok(r.data.warnings.some((w) => w.includes("30件まで")));
});
