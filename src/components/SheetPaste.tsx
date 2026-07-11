"use client";
// 見積書(Excel)を読み取る入力補助。2つの方法がある:
//  1. .xlsx ファイルを選んで読み取る(おすすめ)
//  2. Excelで鑑シートをコピーして貼り付ける
// まず無料のルール読み取りを試し、読めない形の見積書のときだけ
// AI読み取り(有料・1回あたり約1円)に切り替える。
// 読み取った結果は下の登録フォームに入り、確認してから登録する。
// (成功メッセージと注意書きはフォーム側の直前に表示される)

import { useRef, useState } from "react";
import { FileSpreadsheet, FileUp, ScanLine, Sparkles } from "lucide-react";
import { parseQuoteSheet, type ParsedQuoteSheet } from "@/lib/quote-sheet";
import { readWorkbookSheets, type SheetTsv } from "@/lib/xlsx-sheet";

export type ParseSource = "rule" | "ai";

type Props = {
  /** サーバーにAPIキーが設定されているときだけAI読み取りを出す */
  aiEnabled: boolean;
  onParsed: (data: ParsedQuoteSheet, source: ParseSource) => void;
};

export default function SheetPaste({ aiEnabled, onParsed }: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [aiReading, setAiReading] = useState(false);
  // 直前に読み取ったシート(「AIで読み取り直す」用に取っておく)
  const [lastSheets, setLastSheets] = useState<SheetTsv[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const runAi = async (sheets: SheetTsv[]) => {
    setAiReading(true);
    setError(null);
    try {
      const res = await fetch("/api/quotes/ai-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheets }),
      });
      const json = (await res.json().catch(() => null)) as
        | { data?: ParsedQuoteSheet; error?: string }
        | null;
      if (!res.ok || !json?.data) {
        setError(
          json?.error ??
            "AI読み取りに失敗しました。少し時間をおいてもう一度お試しください。",
        );
        return;
      }
      setLastSheets(sheets);
      onParsed(json.data, "ai");
    } catch {
      setError("AI読み取りに失敗しました。通信環境を確認してもう一度お試しください。");
    } finally {
      setAiReading(false);
    }
  };

  const handleParse = () => {
    const parsed = parseQuoteSheet(text);
    if (!parsed.ok) {
      // 決まった形でない見積書はAIに読ませる(設定がある場合)
      if (aiEnabled && text.trim() !== "") {
        void runAi([{ name: "貼り付けた内容", tsv: text }]);
        return;
      }
      setError(parsed.error);
      return;
    }
    setError(null);
    setLastSheets([{ name: "貼り付けた内容", tsv: text }]);
    onParsed(parsed.data, "rule");
  };

  const handleFile = async (file: File) => {
    setReading(true);
    setError(null);
    try {
      const sheets = await readWorkbookSheets(await file.arrayBuffer());
      if (sheets.length === 0) {
        setError("このファイルにはシートがありません。");
        return;
      }
      // 複数シートがある場合は、いちばん多く項目を読み取れたシートを採用する
      let best: ParsedQuoteSheet | null = null;
      let firstError: string | null = null;
      for (const sheet of sheets) {
        const parsed = parseQuoteSheet(sheet.tsv);
        if (!parsed.ok) {
          firstError = firstError ?? parsed.error;
          continue;
        }
        if (!best || parsed.data.items.length > best.items.length) {
          best = parsed.data;
        }
      }
      if (!best) {
        // 決まった形でない見積書はAIに読ませる(設定がある場合)
        if (aiEnabled) {
          await runAi(sheets);
          return;
        }
        setError(
          firstError ??
            "このファイルからは見積書を読み取れませんでした。鑑(表紙)のシートが入った .xlsx ファイルを選んでください。",
        );
        return;
      }
      setLastSheets(sheets);
      onParsed(best, "rule");
    } catch (e) {
      console.error("xlsx read failed:", e);
      setError(
        "このファイルを読み取れませんでした。Excel(.xlsx)形式のファイルを選んでください。",
      );
    } finally {
      setReading(false);
      // 同じファイルをもう一度選んでも読み取れるようにする
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const busy = reading || aiReading;

  return (
    <div className="rounded-lg border border-dashed border-blue-300 bg-blue-50/50 p-3">
      <p className="flex items-center gap-1.5 text-sm font-medium text-blue-900">
        <FileSpreadsheet className="h-4 w-4" aria-hidden />
        見積書(Excel)から自動入力
      </p>
      <p className="mt-1 text-xs text-slate-600">
        見積書のExcelファイル(.xlsx)を選ぶと、日付・顧客名・項目・金額を自動で読み取ってフォームに入れます
        (経費や合計の行は自動で除外されます)。
        {aiEnabled &&
          "決まった形でない見積書は、AIが読み取ります(1回あたり約1円)。"}
      </p>

      <input
        ref={fileRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        aria-label="見積書のExcelファイル"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="mt-2 flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        <FileUp className="h-4 w-4" aria-hidden />
        {reading ? "読み取り中…" : "Excelファイルを選んで読み取る"}
      </button>

      {aiReading && (
        <p
          role="status"
          className="mt-2 flex items-center gap-1.5 rounded-md bg-violet-50 px-3 py-2 text-sm text-violet-800"
        >
          <Sparkles className="h-4 w-4 animate-pulse" aria-hidden />
          AIが見積書を読み取っています…(5〜20秒ほどかかります)
        </p>
      )}

      {aiEnabled && lastSheets && !busy && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span>思った通りに読み取れていないときは:</span>
          <button
            type="button"
            onClick={() => void runAi(lastSheets)}
            className="flex items-center gap-1 rounded-md border border-violet-300 bg-white px-2 py-1 font-medium text-violet-700 hover:bg-violet-50"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            AIで読み取り直す
          </button>
        </div>
      )}

      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-slate-600 hover:text-slate-800">
          コピー&貼り付けで読み取る場合はこちら
        </summary>
        <p className="mt-1 text-xs text-slate-600">
          Excelで見積書の<b>表紙(鑑)のシート全体</b>を選択してコピーし、下に貼り付けてください。
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="ここにExcelからコピーした見積書を貼り付けてください"
          aria-label="見積書の貼り付け欄"
          className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-xs focus:border-blue-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleParse}
          disabled={busy}
          className="mt-2 flex items-center gap-1.5 rounded-md border border-blue-700 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
        >
          <ScanLine className="h-4 w-4" aria-hidden />
          貼り付けた内容を読み取る
        </button>
      </details>

      {error && (
        <p role="alert" className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
