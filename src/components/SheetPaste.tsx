"use client";
// 見積書(Excelの鑑シート)を貼り付けて、内容を自動で読み取る入力補助。
// 読み取った結果は下の登録フォームに入り、確認してから登録する。
// (成功メッセージと注意書きはフォーム側の直前に表示される)

import { useState } from "react";
import { FileSpreadsheet, ScanLine } from "lucide-react";
import { parseQuoteSheet, type ParsedQuoteSheet } from "@/lib/quote-sheet";

type Props = {
  onParsed: (data: ParsedQuoteSheet) => void;
};

export default function SheetPaste({ onParsed }: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleParse = () => {
    const parsed = parseQuoteSheet(text);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setError(null);
    onParsed(parsed.data);
  };

  return (
    <div className="rounded-lg border border-dashed border-blue-300 bg-blue-50/50 p-3">
      <p className="flex items-center gap-1.5 text-sm font-medium text-blue-900">
        <FileSpreadsheet className="h-4 w-4" aria-hidden />
        見積書(Excel)から自動入力
      </p>
      <p className="mt-1 text-xs text-slate-600">
        Excelで見積書の<b>表紙(鑑)のシート全体</b>を選択してコピーし、下に貼り付けてください。
        日付・顧客名・項目・金額を自動で読み取ってフォームに入れます
        (経費や合計の行は自動で除外されます)。
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder="ここにExcelからコピーした見積書を貼り付けてください"
        aria-label="見積書の貼り付け欄"
        className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-xs focus:border-blue-500 focus:outline-none"
      />
      {error && (
        <p role="alert" className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={handleParse}
        className="mt-2 flex items-center gap-1.5 rounded-md border border-blue-700 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
      >
        <ScanLine className="h-4 w-4" aria-hidden />
        見積書を読み取ってフォームに入れる
      </button>
    </div>
  );
}
