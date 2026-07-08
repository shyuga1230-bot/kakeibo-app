"use client";
// まとめて登録(貼り付け取込)。1行=1件。
// エラー行は行番号と理由を表示し、正常な行だけを登録する。
// 登録後は「エラーになった行だけ」を貼り付け欄に残すので、
// 修正して再登録しても成功済みの行が二重登録されることはない。

import { useActionState, useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { bulkImportAction, type ImportResult } from "@/app/actions";
import { notifyDataChanged } from "@/lib/events";

export default function BulkImport() {
  const [text, setText] = useState("");
  const [state, formAction, pending] = useActionState<ImportResult | null, FormData>(
    bulkImportAction,
    null,
  );

  const handled = useRef<ImportResult | null>(null);
  useEffect(() => {
    if (!state || handled.current === state) return;
    handled.current = state;
    if (state.ok) {
      if (state.imported > 0) notifyDataChanged();
      // 貼り付け欄にはエラー行だけを残す(全行成功なら空になる)
      setText(state.failedText);
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-3">
      <div className="rounded-md bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
        <p className="font-medium text-slate-700">書き方(1行が1件になります)</p>
        <p>
          列の順番:<b>日付, 顧客名, 項目(/区切り), 金額(省略可・/区切りで項目に対応)</b>
          。区切りはカンマまたはタブ(Excelからの貼り付けはタブになります)。
        </p>
        <pre className="mt-1 overflow-x-auto rounded bg-white p-2 text-[11px] leading-relaxed">
{`2026/6/1, 山田建設, 3D起工測量/ICT建機レンタル, 500000/1200000
2026-06-03, , 操作講習, 80000
2026/6/5, 佐藤工務店, 3D起工測量/操作講習/ソフトウェア, 450000//300000`}
        </pre>
        <p className="mt-1">
          顧客名や金額は空欄でもかまいません(例の2行目・3行目)。
        </p>
      </div>

      <textarea
        name="bulk_text"
        rows={6}
        required
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="ここにExcelなどからコピーした行を貼り付けてください"
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none"
      />

      {state && !state.ok && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <div className="space-y-2">
          <p
            role="status"
            className={`rounded-md px-3 py-2 text-sm ${
              state.imported > 0
                ? "bg-green-50 text-green-700"
                : "bg-amber-50 text-amber-800"
            }`}
          >
            {state.imported > 0
              ? `✓ ${state.imported}件を登録しました。`
              : "登録できた行はありませんでした。"}
            {state.errors.length > 0 &&
              ` ${state.errors.length}行はエラーのため登録されていません(下の表を確認してください)。`}
            {state.imported > 0 &&
              state.errors.length > 0 &&
              " エラーになった行だけを貼り付け欄に残しました。修正してもう一度登録してください。"}
          </p>
          {state.errors.length > 0 && (
            <div className="overflow-x-auto rounded-md border border-red-200">
              <table className="w-full text-sm">
                <thead className="bg-red-50 text-left text-red-800">
                  <tr>
                    <th className="w-16 px-3 py-1.5 font-medium">行</th>
                    <th className="px-3 py-1.5 font-medium">エラーの理由</th>
                  </tr>
                </thead>
                <tbody>
                  {state.errors.map((err) => (
                    <tr key={`${err.line}-${err.reason}`} className="border-t border-red-100">
                      <td className="px-3 py-1.5 tabular-nums">{err.line}行目</td>
                      <td className="px-3 py-1.5">{err.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex items-center gap-2 rounded-md border border-blue-700 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
      >
        <Upload className="h-4 w-4" aria-hidden />
        {pending ? "取り込み中…" : "貼り付けた内容を登録する"}
      </button>
    </form>
  );
}
