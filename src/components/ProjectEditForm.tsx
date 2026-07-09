"use client";
// 案件詳細ページの基本情報(社名・協力会社・案件名・備考)の編集フォーム。

import { useActionState } from "react";
import { Save } from "lucide-react";
import { updateProjectAction } from "@/app/projects/actions";
import type { ActionResult } from "@/app/actions";
import { notifyProjectDataChanged } from "@/lib/events";
import { useActionSuccess } from "@/lib/hooks";
import type { Partner } from "@/lib/partners";
import ActionMessage from "@/components/ActionMessage";
import PartnerPicker from "@/components/PartnerPicker";

type Props = {
  project: {
    id: number;
    clientName: string | null;
    partnerName: string | null;
    projectName: string;
    memo: string | null;
  };
  partners: Partner[];
};

export default function ProjectEditForm({ project, partners }: Props) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    updateProjectAction.bind(null, project.id),
    null,
  );

  // 保存成功したらヘッダーの集計・更新履歴の表示を読み込み直してもらう
  useActionSuccess(state, notifyProjectDataChanged);

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
          案件名(必須)
          <input
            type="text"
            name="project_name"
            defaultValue={project.projectName}
            required
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          社名(顧客)
          <input
            type="text"
            name="client_name"
            defaultValue={project.clientName ?? ""}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          協力会社(外注先)
          <PartnerPicker
            name="partner_name"
            defaultValue={project.partnerName}
            partners={partners}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
          備考
          <textarea
            name="memo"
            rows={3}
            defaultValue={project.memo ?? ""}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
        </label>
      </div>

      <ActionMessage result={state} />

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-b from-blue-600 to-blue-700 shadow-sm shadow-blue-900/20 px-4 py-2 text-sm font-medium text-white hover:from-blue-700 hover:to-blue-800 disabled:opacity-50"
        >
          <Save className="h-4 w-4" aria-hidden />
          {pending ? "保存中…" : "基本情報を保存"}
        </button>
      </div>
    </form>
  );
}
