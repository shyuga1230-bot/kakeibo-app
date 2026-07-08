// CSVエクスポート用の文字列生成。
// Excel で開いても文字化けしないよう、先頭に BOM を付けた UTF-8 / CRLF 改行で出力する。

/**
 * Excel が数式として解釈する文字(= + - @ タブ)で始まる文字列は、
 * 先頭にシングルクォートを付けて「ただの文字」として扱わせる。
 * 悪意ある数式(例: =HYPERLINK(...))が他の人のExcelで実行されるのを防ぐため。
 */
function guardFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildCsv(rows: (string | number | null)[][]): string {
  const body = rows
    .map((row) =>
      row
        .map((v) => {
          if (v == null) return "";
          if (typeof v === "number") return String(v);
          return escapeCsvField(guardFormula(v));
        })
        .join(","),
    )
    .join("\r\n");
  // 先頭の ﻿ は BOM(Excel が UTF-8 と認識するための目印)
  return "\uFEFF" + body + "\r\n";
}
