"use client";
// 見積もりの削除ボタン。誤操作防止のため2段階確認にしている。
// 1回目: 「削除」ボタン → 確認ダイアログを表示
// 2回目: ダイアログ内の「削除する」ボタン → 実際に削除

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, TriangleAlert, X } from "lucide-react";
import { deleteQuoteAction } from "@/app/actions";
import { notifyDataChanged } from "@/lib/events";

type Props = {
  quoteId: number;
  /** ダイアログに表示する見積もりの説明(例: 「2026/6/1 山田建設(3項目)」) */
  description: string;
};

export default function DeleteQuoteButton({ quoteId, description }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const confirmDelete = () => {
    startTransition(async () => {
      const result = await deleteQuoteAction(quoteId);
      if (result.ok) {
        setOpen(false);
        notifyDataChanged();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-slate-500 hover:bg-red-50 hover:text-red-600"
        title="この見積もりを削除します(確認画面が出ます)"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
        削除
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`delete-dialog-title-${quoteId}`}
          onClick={(e) => {
            if (e.target === e.currentTarget && !pending) setOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <h3
                id={`delete-dialog-title-${quoteId}`}
                className="flex items-center gap-2 text-base font-bold text-red-700"
              >
                <TriangleAlert className="h-5 w-5" aria-hidden />
                この見積もりを削除しますか?
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                aria-label="閉じる"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {description}
            </p>
            <p className="mt-3 text-sm font-medium text-red-700">
              削除すると<b>全員のデータから消えます</b>。この操作は元に戻せません。
            </p>

            {error && (
              <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                キャンセル(削除しない)
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={pending}
                className="flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                {pending ? "削除中…" : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
