// CSV生成のテスト。実行方法: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCsv } from "../src/lib/csv";

test("buildCsv: BOM付き・CRLF改行・カンマや引用符のエスケープ", () => {
  const csv = buildCsv([
    ["見積もりID", "顧客名", "金額(円)"],
    [1, "山田,建設", 500000],
    [2, '引用"符', null],
  ]);
  assert.ok(csv.startsWith("\uFEFF"), "先頭にBOMが付く");
  const lines = csv.slice(1).split("\r\n");
  assert.equal(lines[0], "見積もりID,顧客名,金額(円)");
  assert.equal(lines[1], '1,"山田,建設",500000');
  assert.equal(lines[2], '2,"引用""符",');
  assert.equal(lines[3], "", "末尾に改行");
});

test("buildCsv: Excelの数式として解釈される文字列は無害化される", () => {
  const csv = buildCsv([
    ['=HYPERLINK("http://example.com")', "+123abc", "-値引き", "@x", "普通の文字"],
    [500000, null, "a=b", "1+1", "x"],
  ]);
  const lines = csv.slice(1).split("\r\n");
  assert.equal(
    lines[0],
    `'=HYPERLINK(""http://example.com"")",'+123abc,'-値引き,'@x,普通の文字`.replace(/^/, '"'),
  );
  // 数値はそのまま、先頭以外の = や + は無害
  assert.equal(lines[1], "500000,,a=b,1+1,x");
});
