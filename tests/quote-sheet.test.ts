// 見積書(鑑シート)読み取りのテスト。実行方法: npm test
// 実際の見積書の様式(新旧2種類)を再現したデータで確認する。
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseQuoteSheet } from "../src/lib/quote-sheet";

const T = "\t";
function tsv(rows: string[][]): string {
  return rows.map((r) => r.join(T)).join("\n");
}

// 新しい様式(鑑): 発行日ラベル・御中・工事名・費目ヘッダー・丸数字付き明細
const MODERN_SHEET = tsv([
  ["", "", "", "", "", "発行日", "2026年4月7日"],
  ["御 見 積 書"],
  ["コンゴー測器 株式会社", "御中", "", "", "", "", "", "ICT施工サポート"],
  ["益城中央線交通安全対策補助(安永地区改良その23)工事 他合併"],
  ["", "", "", "株式会社Ark"],
  ["下記の通り、お見積りさせていただきます。"],
  ["本見積書有効期限", "2026年4月30日"],
  ["費目・工種・種別・細別", "", "数量", "単位", "単価", "金額", "備考"],
  ["【i-Construction 測量業務】", "【ICT土工】"],
  ["①３次元起工測量", "", "1 ", "式", "668,000 ", "668,000 ", ""],
  ["②３次元設計ﾃﾞｰﾀ作成", "", "1 ", "式", "293,000 ", "293,000 ", ""],
  ["④３次元出来形管理等の施工管理", "", "1 ", "式", "680,000 ", "680,000 ", ""],
  ["⑤３次元データの納品", "", "1 ", "式", "166,000 ", "166,000 ", ""],
  ["現場管理費", "", "1 ", "式", "175,000 ", "175,000 ", ""],
  ["一般管理費等", "", "1 ", "式", "147,000 ", "147,000 ", ""],
  ["", "合計", "税抜", "", "", "消費税(10%)", "総額"],
  ["", "", "2,129,000 ", "", "", "212,900 ", "2,341,900 "],
  ["御見積条件"],
  ["・作業時間は8時から17時の間で考えています。"],
]);

test("新様式の鑑: 日付・顧客名・工事名・明細を読み取れる", () => {
  const result = parseQuoteSheet(MODERN_SHEET);
  assert.ok(result.ok, JSON.stringify(result));
  if (!result.ok) return;
  const d = result.data;

  assert.equal(d.quoteDate, "2026-04-07", "有効期限(4/30)ではなく発行日を拾う");
  assert.equal(d.customerName, "コンゴー測器 株式会社");
  assert.ok(d.memo?.includes("益城中央線"), `memo=${d.memo}`);

  // 丸数字が外れ、全角・半角カナが正規化される。経費行は含まれない
  assert.deepEqual(
    d.items.map((i) => i.itemName),
    ["3次元起工測量", "3次元設計データ作成", "3次元出来形管理等の施工管理", "3次元データの納品"],
  );
  assert.deepEqual(
    d.items.map((i) => i.amount),
    [668000, 293000, 680000, 166000],
  );
  // 経費を読み飛ばした案内が出る
  assert.ok(d.warnings.some((w) => w.includes("現場管理費")));
});

// 古い様式(鏡): 見積日ラベル・「◯◯ 様」・品名ヘッダー
const OLD_SHEET = tsv([
  ["御 見 積 書"],
  ["株式会社 藤川建設　様", "", "様"],
  ["下記の通り御見積申し上げます。"],
  ["見積日", "2024/6/1"],
  ["納期", "20日間"],
  ["品　　　名", "", "", "", "数量", "単価", "金額", "摘要"],
  ["３Ｄ起工測量", "", "基本料金", "", "1", "450,000", "450,000", ""],
  ["ICT建機レンタル", "", "", "", "1", "1,200,000", "1,200,000", ""],
  ["", "合計", "", "", "", "", "1,650,000", ""],
]);

test("旧様式の鏡: 「様」付き顧客名と品名ヘッダーを読み取れる", () => {
  const result = parseQuoteSheet(OLD_SHEET);
  assert.ok(result.ok, JSON.stringify(result));
  if (!result.ok) return;
  const d = result.data;

  assert.equal(d.quoteDate, "2024-06-01");
  assert.equal(d.customerName, "株式会社 藤川建設");
  assert.deepEqual(
    d.items.map((i) => i.itemName),
    ["3D起工測量", "ICT建機レンタル"],
  );
  assert.deepEqual(d.items.map((i) => i.amount), [450000, 1200000]);
});

test("Excel以外の文章はエラーになる(タブ区切りでない)", () => {
  const result = parseQuoteSheet("これはただの文章です。\n見積書ではありません。");
  assert.ok(!result.ok);
  if (result.ok) return;
  assert.ok(result.error.includes("Excel"));
});

test("明細ヘッダーが無い場合はエラーになる", () => {
  const result = parseQuoteSheet(tsv([["あいう", "えお"], ["かきく", "けこ"]]));
  assert.ok(!result.ok);
});

test("空文字はエラーになる", () => {
  const result = parseQuoteSheet("   ");
  assert.ok(!result.ok);
});

test("日付が無くても明細があれば読み取れる(注意書き付き)", () => {
  const sheet = tsv([
    ["テスト商事", "御中"],
    ["品名", "金額"],
    ["測量", "100,000"],
  ]);
  const result = parseQuoteSheet(sheet);
  assert.ok(result.ok, JSON.stringify(result));
  if (!result.ok) return;
  assert.equal(result.data.quoteDate, null);
  assert.ok(result.data.warnings.some((w) => w.includes("日付")));
  assert.equal(result.data.items.length, 1);
});

test("金額が読めない明細は金額空欄で取り込む", () => {
  const sheet = tsv([
    ["テスト商事", "御中"],
    ["品名", "金額"],
    ["測量", "一式"],
    ["講習", "50,000"],
  ]);
  const result = parseQuoteSheet(sheet);
  assert.ok(result.ok);
  if (!result.ok) return;
  assert.deepEqual(result.data.items, [
    { itemName: "測量", amount: null },
    { itemName: "講習", amount: 50000 },
  ]);
  assert.ok(result.data.warnings.some((w) => w.includes("一式")));
});

// --- レビューで見つかった問題の回帰テスト ---------------------------------

test("「合　計」(空白入り)の締め行でも止まり、備考行を項目にしない", () => {
  const sheet = tsv([
    ["株式会社 藤川建設　様"],
    ["見積日", "2024/6/1"],
    ["品　　　名", "", "", "", "数量", "単価", "金額", "摘要"],
    ["３Ｄ起工測量", "", "", "", "1", "450,000", "450,000", ""],
    ["ICT建機レンタル", "", "", "", "1", "1,200,000", "1,200,000", ""],
    ["", "合　計", "", "", "", "", "1,650,000", ""],
    ["納期", "20日間"],
    ["・現場までの交通費は含みません。"],
  ]);
  const result = parseQuoteSheet(sheet);
  assert.ok(result.ok);
  if (!result.ok) return;
  assert.deepEqual(
    result.data.items.map((i) => i.itemName),
    ["3D起工測量", "ICT建機レンタル"],
  );
});

test("日付形式の見積番号(8桁数字)より、明示的な日付表記を優先する", () => {
  const sheet = tsv([
    ["見積No.", "20260401", "", "発行日", "2026/4/7"],
    ["テスト商事", "御中"],
    ["品名", "金額"],
    ["測量", "100,000"],
  ]);
  const result = parseQuoteSheet(sheet);
  assert.ok(result.ok);
  if (!result.ok) return;
  assert.equal(result.data.quoteDate, "2026-04-07");
});

test("発行日セルが8桁数字だけの場合は日付として読める", () => {
  const sheet = tsv([
    ["発行日", "20260407"],
    ["テスト商事", "御中"],
    ["品名", "金額"],
    ["測量", "100,000"],
  ]);
  const result = parseQuoteSheet(sheet);
  assert.ok(result.ok);
  if (!result.ok) return;
  assert.equal(result.data.quoteDate, "2026-04-07");
});

test("「合計」を含むだけの項目名(数量合計表作成など)で読み取りが止まらない", () => {
  const sheet = tsv([
    ["テスト商事", "御中"],
    ["品名", "金額"],
    ["3D起工測量", "100,000"],
    ["数量合計表作成", "50,000"],
    ["ICT建機レンタル(税込)", "80,000"],
    ["合計", "230,000"],
  ]);
  const result = parseQuoteSheet(sheet);
  assert.ok(result.ok);
  if (!result.ok) return;
  assert.deepEqual(
    result.data.items.map((i) => i.itemName),
    ["3D起工測量", "数量合計表作成", "ICT建機レンタル(税込)"],
  );
});

test("途中の「小計」行は読み飛ばし、後の項目も読み取る", () => {
  const sheet = tsv([
    ["テスト商事", "御中"],
    ["品名", "金額"],
    ["測量A", "100,000"],
    ["小計", "100,000"],
    ["講習B", "50,000"],
    ["合計", "150,000"],
  ]);
  const result = parseQuoteSheet(sheet);
  assert.ok(result.ok);
  if (!result.ok) return;
  assert.deepEqual(
    result.data.items.map((i) => i.itemName),
    ["測量A", "講習B"],
  );
});

test("合計行の後に明細らしき行が残っていたら注意書きを出す", () => {
  const sheet = tsv([
    ["テスト商事", "御中"],
    ["品名", "金額"],
    ["測量A", "100,000"],
    ["合計", "100,000"],
    ["追加項目B", "50,000"],
  ]);
  const result = parseQuoteSheet(sheet);
  assert.ok(result.ok);
  if (!result.ok) return;
  assert.deepEqual(result.data.items.map((i) => i.itemName), ["測量A"]);
  assert.ok(result.data.warnings.some((w) => w.includes("合計行より後")));
});

// --- 「余計なものを読み取らない」ための回帰テスト --------------------------

test("金額が空の行(区分名・備考)は項目にせず、まとめて知らせる", () => {
  const sheet = tsv([
    ["テスト商事", "御中"],
    ["品名", "数量", "金額"],
    ["ICT土工", "", ""], // 区分名(金額なし)
    ["3D起工測量", "1", "450,000"],
    ["現場写真はデータ納品", "", ""], // 備考(金額なし)
    ["合計", "", "450,000"],
  ]);
  const result = parseQuoteSheet(sheet);
  assert.ok(result.ok, JSON.stringify(result));
  if (!result.ok) return;
  assert.deepEqual(result.data.items, [{ itemName: "3D起工測量", amount: 450000 }]);
  assert.ok(
    result.data.warnings.some(
      (w) => w.includes("金額が入っていない") && w.includes("ICT土工"),
    ),
  );
});

test("「以下余白」や「※注記」の行は項目にしない(警告にも出さない)", () => {
  const sheet = tsv([
    ["テスト商事", "御中"],
    ["品名", "金額"],
    ["測量", "100,000"],
    ["※現場条件により変動します", ""],
    ["以下余白", ""],
    ["合計", "100,000"],
  ]);
  const result = parseQuoteSheet(sheet);
  assert.ok(result.ok);
  if (!result.ok) return;
  assert.deepEqual(result.data.items.map((i) => i.itemName), ["測量"]);
  assert.ok(!result.data.warnings.some((w) => w.includes("余白")));
  assert.ok(!result.data.warnings.some((w) => w.includes("現場条件")));
});

test("「計」だけの行では止まらず、項目にもしない", () => {
  const sheet = tsv([
    ["テスト商事", "御中"],
    ["品名", "金額"],
    ["測量A", "100,000"],
    ["計", "100,000"],
    ["講習B", "50,000"],
    ["合計", "150,000"],
  ]);
  const result = parseQuoteSheet(sheet);
  assert.ok(result.ok);
  if (!result.ok) return;
  assert.deepEqual(
    result.data.items.map((i) => i.itemName),
    ["測量A", "講習B"],
  );
});

test("見出しが「名称」「金額(円)」でも明細を読み取れる", () => {
  const sheet = tsv([
    ["テスト商事", "御中"],
    ["名称", "数量", "金額(円)"],
    ["3D起工測量", "1", "450,000"],
    ["合計", "", "450,000"],
  ]);
  const result = parseQuoteSheet(sheet);
  assert.ok(result.ok, JSON.stringify(result));
  if (!result.ok) return;
  assert.deepEqual(result.data.items, [{ itemName: "3D起工測量", amount: 450000 }]);
});

test("セル結合で項目名の列がずれていても、金額がある行は読み取れる", () => {
  const sheet = tsv([
    ["テスト商事", "御中"],
    ["費目・工種", "", "", "数量", "単位", "金額"],
    ["3D起工測量", "", "", "1", "式", "450,000"],
    ["", "ICT建機レンタル", "", "1", "式", "1,200,000"], // 名前列が1つ右にずれた行
    ["", "・備考はここに書きます", "", "", "", ""], // 金額なしの注記はずれていても拾わない
    ["", "合計", "", "", "", "1,650,000"],
  ]);
  const result = parseQuoteSheet(sheet);
  assert.ok(result.ok, JSON.stringify(result));
  if (!result.ok) return;
  assert.deepEqual(result.data.items, [
    { itemName: "3D起工測量", amount: 450000 },
    { itemName: "ICT建機レンタル", amount: 1200000 },
  ]);
});

test("支払条件の文章(・工事代金のお支払い…)をメモに拾わない", () => {
  const sheet = tsv([
    ["テスト商事", "御中"],
    ["・工事代金のお支払いは翌月末現金でお願いします。"],
    ["品名", "金額"],
    ["測量", "100,000"],
  ]);
  const result = parseQuoteSheet(sheet);
  assert.ok(result.ok);
  if (!result.ok) return;
  assert.equal(result.data.memo, null);
});
