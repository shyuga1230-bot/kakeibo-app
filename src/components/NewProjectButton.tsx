"use client";
// 「案件を追加」ボタンと登録ダイアログ。
// 案件名だけ必須で、社名・協力会社・備考はあとから入れられる。

import { useActionState, useEffect, useRef, useState } from "react";
import { CirclePlus, X } from "lucide-react";
import { createProjectAction } from "@/app/projects/actions";
import type { ActionResult } from "@/app/actions";
import { notifyProjectDataChanged } from "@/lib/events";

export default function NewProjectButton() {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    createProjectAction,
    null,
  );

  // 登録成功したらダイアログを閉じ、一覧とヘッダーの集計に反映する
  // (同じ状態を二度処理しないようrefで管理)
  const handled = useRef<ActionResult | null>(null);
  useEffect(() => {
    if (!state || handled.current === state) return;
    handled.current = state;
    if (state.ok) {
      formRef.current?.reset();
      setOpen(false);
      notifyProjectDataChanged();
    }
  }, [state]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
      >
        <CirclePlus className="h-4 w-4" aria-hidden />
        案件を追加
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-project-dialog-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !pending) setOpen(false);
          }}
        >
          <div className="max-h-full w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <h3 id="new-project-dialog-title" className="text-base font-bold">
                新しい案件を追加
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

            <form ref={formRef} action={formAction} className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                案件名(必須)
                <input
                  type="text"
                  name="project_name"
                  required
                  placeholder="例: ○○地区道路改良工事"
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                社名(顧客・任意)
                <input
                  type="text"
                  name="client_name"
                  placeholder="例: 山田建設"
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                協力会社(外注先・任意)
                <input
                  type="text"
                  name="partner_name"
                  placeholder="例: ○○測量"
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                備考(任意)
                <textarea
                  name="memo"
                  rows={2}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                />
              </label>

              {state && !state.ok && (
                <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {state.error}
                </p>
              )}

              <p className="text-xs text-slate-500">
                工程の進捗(受注者データ〜完了後フォロー)は、登録後に一覧表のセルを押して入力します。
              </p>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  {pending ? "登録中…" : "登録する"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
