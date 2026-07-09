"use client";
// 「案件を追加」ボタンと登録ダイアログ。
// 案件名だけ必須で、社名・協力会社・備考はあとから入れられる。

import { useActionState, useState } from "react";
import { CirclePlus } from "lucide-react";
import { createProjectAction } from "@/app/projects/actions";
import type { ActionResult } from "@/app/actions";
import { notifyProjectDataChanged } from "@/lib/events";
import { useActionSuccess } from "@/lib/hooks";
import type { Partner } from "@/lib/partners";
import Dialog from "@/components/Dialog";
import ActionMessage from "@/components/ActionMessage";
import PartnerPicker from "@/components/PartnerPicker";

export default function NewProjectButton({ partners }: { partners: Partner[] }) {
  const [open, setOpen] = useState(false);

  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    createProjectAction,
    null,
  );

  // 登録成功したらダイアログを閉じ、一覧とヘッダーの集計に反映する
  useActionSuccess(state, () => {
    setOpen(false);
    notifyProjectDataChanged();
  });

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
        <Dialog
          titleId="new-project-dialog-title"
          pending={pending}
          onClose={() => setOpen(false)}
          panelClassName="max-h-full overflow-y-auto"
          header={
            <h3 id="new-project-dialog-title" className="text-base font-bold">
              新しい案件を追加
            </h3>
          }
        >
          <form action={formAction} className="mt-4 space-y-3">
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
              <PartnerPicker name="partner_name" defaultValue={null} partners={partners} />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              備考(任意)
              <textarea
                name="memo"
                rows={2}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
              />
            </label>

            {state && !state.ok && <ActionMessage result={state} />}

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
        </Dialog>
      )}
    </>
  );
}
