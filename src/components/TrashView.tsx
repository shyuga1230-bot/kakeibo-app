"use client";
// ごみ箱の一覧と「戻す」ボタン。
// 戻したあとはページを再読み込みして最新のごみ箱を表示する
// (めったに使わない画面なので、確実さを優先してシンプルに作る)。

import { useState, useTransition } from "react";
import { Undo2 } from "lucide-react";
import {
  restoreDocumentAction,
  restoreProjectAction,
  restoreQuoteAction,
} from "@/app/actions";
import type { ActionResult } from "@/app/actions";

type Row = {
  key: string;
  title: string;
  subtitle: string;
  deletedAt: string;
  restore: () => Promise<ActionResult>;
};

function RestoreRow({ row }: { row: Row }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onRestore = () =>
    startTransition(async () => {
      const result = await row.restore();
      if (result.ok) {
        window.location.reload();
      } else {
        setError(result.error);
      }
    });

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="min-w-0">
        <p className="break-all text-sm font-medium">{row.title}</p>
        <p className="text-xs text-slate-500">
          {row.subtitle && <span className="mr-2">{row.subtitle}</span>}
          削除日: {row.deletedAt}
        </p>
        {error && (
          <p role="alert" className="mt-1 text-xs text-red-700">
            {error}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onRestore}
        disabled={pending}
        className="flex shrink-0 items-center gap-1.5 rounded-md border border-blue-700 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
      >
        <Undo2 className="h-4 w-4" aria-hidden />
        {pending ? "戻しています…" : "戻す"}
      </button>
    </li>
  );
}

export type TrashViewProps = {
  quotes: { id: number; title: string; subtitle: string; deletedAt: string }[];
  projects: { id: number; title: string; subtitle: string; deletedAt: string }[];
  documents: { id: number; title: string; subtitle: string; deletedAt: string }[];
};

export default function TrashView({ quotes, projects, documents }: TrashViewProps) {
  return (
    <div className="space-y-4">
      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5 sm:p-6">
        <h2 className="text-base font-bold">見積もり({quotes.length}件)</h2>
        {quotes.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">削除された見積もりはありません。</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {quotes.map((q) => (
              <RestoreRow
                key={`q-${q.id}`}
                row={{
                  key: `q-${q.id}`,
                  title: q.title,
                  subtitle: q.subtitle,
                  deletedAt: q.deletedAt,
                  restore: () => restoreQuoteAction(q.id),
                }}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5 sm:p-6">
        <h2 className="text-base font-bold">書類(納品書・請求書)({documents.length}件)</h2>
        {documents.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">削除された書類はありません。</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {documents.map((d) => (
              <RestoreRow
                key={`d-${d.id}`}
                row={{
                  key: `d-${d.id}`,
                  title: d.title,
                  subtitle: d.subtitle,
                  deletedAt: d.deletedAt,
                  restore: () => restoreDocumentAction(d.id),
                }}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5 sm:p-6">
        <h2 className="text-base font-bold">案件({projects.length}件)</h2>
        {projects.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">削除された案件はありません。</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {projects.map((p) => (
              <RestoreRow
                key={`p-${p.id}`}
                row={{
                  key: `p-${p.id}`,
                  title: p.title,
                  subtitle: p.subtitle,
                  deletedAt: p.deletedAt,
                  restore: () => restoreProjectAction(p.id),
                }}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
