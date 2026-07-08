// 入力値の正規化(表記ゆれをそろえる)処理。
// 画面とサーバーの両方から使うため、外部に依存しない純粋な関数だけを置く。

/**
 * 項目名の正規化。
 * - 全角英数字・記号を半角に(NFKC正規化。例: ３Ｄ → 3D)
 * - 前後の空白を除去
 * - 全角スペースは半角に
 * - 連続する空白は1つにまとめる
 */
export function normalizeItemName(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/　/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/** 全角の数字・記号を半角に直す */
function toHalfWidth(s: string): string {
  return s.replace(/[０-９．，－￥]/g, (ch) =>
    "0123456789.,-¥"["０１２３４５６７８９．，－￥".indexOf(ch)],
  );
}

/**
 * 金額の正規化。「1,200,000」「¥1200000」「１２００円」などを整数(円)にする。
 * 空文字・空白のみは null(金額未入力)。
 * 解釈できない場合は { error } を返す。
 */
export function parseAmount(
  raw: string | null | undefined,
): { value: number | null; error?: string } {
  if (raw == null) return { value: null };
  let s = toHalfWidth(String(raw)).replace(/　/g, " ").trim();
  if (s === "") return { value: null };
  // 通貨記号・単位・桁区切り・空白を除去
  s = s.replace(/[¥\\]/g, "").replace(/円/g, "").replace(/,/g, "").replace(/ /g, "");
  if (s === "") return { value: null };
  if (!/^-?\d+(\.\d+)?$/.test(s)) {
    return { value: null, error: `金額「${raw}」を数字として読み取れません` };
  }
  const n = Math.round(Number(s));
  if (!Number.isFinite(n)) {
    return { value: null, error: `金額「${raw}」を数字として読み取れません` };
  }
  if (n < 0) return { value: null, error: "金額にマイナスは入力できません" };
  // データベース(整数型)に保存できる上限に合わせる
  if (n > 2_000_000_000) {
    return { value: null, error: `金額「${raw}」が大きすぎます(20億円まで)` };
  }
  return { value: n };
}

/**
 * 日付の正規化。「2026/6/1」「2026-06-01」「2026.6.1」「2026年6月1日」などを
 * "YYYY-MM-DD" 形式にする。読み取れない場合は { error } を返す。
 */
export function parseDate(raw: string): { value: string | null; error?: string } {
  const s = toHalfWidth(String(raw)).replace(/　/g, " ").trim();
  if (s === "") return { value: null, error: "日付が入力されていません" };
  const m =
    s.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/) ??
    s.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日?$/) ??
    s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!m) {
    return {
      value: null,
      error: `日付「${raw}」を読み取れません(例: 2026/6/1、2026-06-01)`,
    };
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (y < 1900 || y > 2200) {
    return { value: null, error: `日付「${raw}」の年が正しくありません` };
  }
  // 実在する日付かチェック(例: 2月30日は不可)
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
    return { value: null, error: `日付「${raw}」は実在しない日付です` };
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return { value: `${y}-${pad(mo)}-${pad(d)}` };
}

export type ParsedImportRow = {
  line: number; // 元テキストでの行番号(1始まり)
  date: string;
  customerName: string | null;
  items: { itemName: string; amount: number | null }[];
};

export type ImportRowError = {
  line: number;
  reason: string;
};

/**
 * まとめて登録(貼り付け取込)のテキストを解析する。
 * 1行 = 1件。区切りはタブまたはカンマ。
 * 列順: 日付, 顧客名, 項目(スラッシュ区切り), 金額(省略可・スラッシュ区切りで項目と対応)
 */
export function parseBulkText(text: string): {
  rows: ParsedImportRow[];
  errors: ImportRowError[];
} {
  const rows: ParsedImportRow[] = [];
  const errors: ImportRowError[] = [];
  const lines = text.split(/\r\n|\r|\n/);

  lines.forEach((rawLine, i) => {
    const line = i + 1;
    if (rawLine.trim() === "") return; // 空行は読み飛ばす

    // タブが含まれていればタブ区切り(Excelからの貼り付け)、なければカンマ区切り
    const cols = (rawLine.includes("\t") ? rawLine.split("\t") : rawLine.split(",")).map(
      (c) => c.trim(),
    );
    // Excelの貼り付けでは末尾に空の列が付くことがあるので取り除く
    while (cols.length > 4 && cols[cols.length - 1] === "") cols.pop();

    if (cols.length < 3) {
      errors.push({
        line,
        reason:
          "列が足りません。「日付, 顧客名, 項目(/区切り), 金額(省略可)」の順で入力してください",
      });
      return;
    }
    if (cols.length > 4) {
      errors.push({
        line,
        reason:
          "列が多すぎます(4列まで)。顧客名や項目名にカンマが含まれる場合はタブ区切りで貼り付けてください",
      });
      return;
    }

    const dateResult = parseDate(cols[0]);
    if (!dateResult.value) {
      errors.push({ line, reason: dateResult.error ?? "日付を読み取れません" });
      return;
    }

    const customerName = cols[1] === "" ? null : cols[1];

    // 全角スラッシュ「/」も区切りとして扱う
    const itemNames = cols[2].replace(/／/g, "/").split("/").map((s) => normalizeItemName(s));
    if (itemNames.length === 0 || itemNames.some((n) => n === "")) {
      errors.push({
        line,
        reason: "項目名が空です。「3D起工測量/ICT建機レンタル」のように / で区切って入力してください",
      });
      return;
    }
    if (new Set(itemNames).size !== itemNames.length) {
      errors.push({ line, reason: "同じ項目名が2回以上含まれています" });
      return;
    }

    // 金額列(4列目)は省略可。スラッシュ区切りで項目と同じ順番に対応させる。
    let amounts: (number | null)[] = itemNames.map(() => null);
    if (cols.length === 4 && cols[3].trim() !== "") {
      const amountParts = cols[3].replace(/／/g, "/").split("/").map((s) => s.trim());
      if (amountParts.length !== itemNames.length) {
        errors.push({
          line,
          reason: `金額の数(${amountParts.length}個)が項目の数(${itemNames.length}個)と合いません。金額も / で区切り、不明な項目は空にしてください(例: 500000//120000)`,
        });
        return;
      }
      const parsed: (number | null)[] = [];
      for (const part of amountParts) {
        const r = parseAmount(part);
        if (r.error) {
          errors.push({ line, reason: r.error });
          return;
        }
        parsed.push(r.value);
      }
      amounts = parsed;
    }

    rows.push({
      line,
      date: dateResult.value,
      customerName,
      items: itemNames.map((itemName, idx) => ({ itemName, amount: amounts[idx] })),
    });
  });

  return { rows, errors };
}
