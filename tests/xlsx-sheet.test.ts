// Excelファイルの読み取り(セル変換・シート→タブ区切り)のテスト。実行方法: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { cellToText, readWorkbookSheets } from "../src/lib/xlsx-sheet";
import { parseQuoteSheet } from "../src/lib/quote-sheet";

test("cellToText: いろいろな型のセル値を文字列にする", () => {
  assert.equal(cellToText(null), "");
  assert.equal(cellToText(undefined), "");
  assert.equal(cellToText("山田建設"), "山田建設");
  assert.equal(cellToText(480000), "480000");
  assert.equal(cellToText(new Date(Date.UTC(2026, 6, 9))), "2026/7/9");
  // 書式付き文字列(richText)
  assert.equal(
    cellToText({ richText: [{ text: "御見" }, { text: "積書" }] }),
    "御見積書",
  );
  // 数式セルは計算結果を使う
  assert.equal(cellToText({ formula: "A1*2", result: 960000 }), "960000");
  // エラーセルは空
  assert.equal(cellToText({ error: "#REF!" }), "");
});

test("readWorkbookSheets → parseQuoteSheet: 見積書の鑑シートを読み取れる", async () => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("鑑");
  ws.addRow(["御見積書", "", "", ""]);
  ws.addRow(["", "", "発行日", new Date(Date.UTC(2026, 5, 1))]);
  ws.addRow(["山田建設 御中", "", "", ""]);
  ws.addRow(["件名", "○○地区 測量業務", "", ""]);
  ws.addRow(["No.", "品名", "数量", "金額"]);
  ws.addRow(["①", "3D起工測量", "", 480000]);
  ws.addRow(["②", "ICT建機レンタル", "", 1200000]);
  ws.addRow(["", "現場管理費", "", 50000]); // 経費は除外される
  ws.addRow(["", "合計", "", 1730000]); // 締め行
  const buffer = await wb.xlsx.writeBuffer();

  const sheets = await readWorkbookSheets(buffer as ArrayBuffer);
  assert.equal(sheets.length, 1);
  assert.equal(sheets[0].name, "鑑");

  const parsed = parseQuoteSheet(sheets[0].tsv);
  assert.ok(parsed.ok, `読み取り失敗: ${!parsed.ok ? parsed.error : ""}`);
  if (!parsed.ok) return;
  assert.equal(parsed.data.quoteDate, "2026-06-01");
  assert.ok(parsed.data.customerName?.includes("山田建設"));
  assert.deepEqual(
    parsed.data.items.map((i) => [i.itemName, i.amount]),
    [
      ["3D起工測量", 480000],
      ["ICT建機レンタル", 1200000],
    ],
  );
});

test("readWorkbookSheets: 1列だけの行もタブ区切りになる(列数を最大行にそろえる)", async () => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("S");
  ws.addRow(["タイトルだけの行"]);
  ws.addRow(["a", "b", "c"]);
  const buffer = await wb.xlsx.writeBuffer();

  const [sheet] = await readWorkbookSheets(buffer as ArrayBuffer);
  const lines = sheet.tsv.split("\n");
  assert.equal(lines[0], "タイトルだけの行\t\t");
  assert.equal(lines[1], "a\tb\tc");
});
