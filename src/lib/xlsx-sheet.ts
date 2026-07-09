// Excelファイル(.xlsx)のシートを、見積書読み取り(quote-sheet.ts)が扱える
// タブ区切りテキストに変換する処理。
// exceljs はサイズが大きいので、実際に使う瞬間に動的に読み込む。

// 読み取る範囲の上限(鑑シートは小さいので十分。巨大ファイル対策)
const MAX_ROWS = 500;
const MAX_COLS = 50;

/** exceljsのセル値(文字列・数値・日付・数式など)を表示用の文字列にする */
export function cellToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value instanceof Date) {
    // Excelの日付セルはUTCのDateとして届く
    return `${value.getUTCFullYear()}/${value.getUTCMonth() + 1}/${value.getUTCDate()}`;
  }
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    if (Array.isArray(v.richText)) {
      // 書式付き文字列は各パーツの文字を連結
      return v.richText
        .map((part) => cellToText((part as { text?: unknown }).text))
        .join("");
    }
    if ("result" in v) return cellToText(v.result); // 数式セルは計算結果を使う
    if ("text" in v) return cellToText(v.text); // ハイパーリンクなど
    if ("error" in v) return "";
  }
  return "";
}

export type SheetTsv = { name: string; tsv: string };

/** ワークブックの全シートを「シート名+タブ区切りテキスト」にする */
export async function readWorkbookSheets(buffer: ArrayBuffer): Promise<SheetTsv[]> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  return workbook.worksheets.map((ws) => {
    // まず全行を文字列の配列にする(row.values は1始まりの配列)
    const rows: string[][] = [];
    ws.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      if (rowNumber > MAX_ROWS) return;
      const values = row.values as unknown[];
      const cells: string[] = [];
      const colCount = Math.min(values.length - 1, MAX_COLS);
      for (let c = 1; c <= colCount; c++) {
        // セル内のタブ・改行は区切りと混ざらないよう空白にする
        cells.push(cellToText(values[c]).replace(/[\t\r\n]+/g, " "));
      }
      rows.push(cells);
    });
    // 列数を最大の行にそろえる(1列だけの行にもタブ区切りができるように)
    const maxCols = Math.max(2, ...rows.map((r) => r.length));
    const lines = rows.map((r) =>
      [...r, ...Array(maxCols - r.length).fill("")].join("\t"),
    );
    return { name: ws.name, tsv: lines.join("\n") };
  });
}
