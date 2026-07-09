"use client";
// 案件詳細ページの工程一覧。13工程の状態・日付・メモをまとめて編集して保存する。

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { updateStagesAction } from "@/app/projects/actions";
import type { ActionResult } from "@/app/actions";
import { notifyProjectDataChanged } from "@/lib/events";
import { todayLocalISO } from "@/lib/format";
import {
  STAGES,
  STATUSES,
  statusDef,
  type StageKey,
  type StageStateMap,
  type StageStatus,
} from "@/lib/project-stages";

type Row = { status: StageStatus; date: string; memo: string };

type Props = {
  projectId: number;
  stages: StageStateMap;
};

export default function ProjectStageEditor({ projectId, stages }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<Record<StageKey, Row>>(() => {
    const init = {} as Record<StageKey, Row>;
    for (const s of STAGES) {
      const st = stages[s.key];
      init[s.key] = {
        status: st?.status ?? "not_started",
        date: st?.date ?? "",
        memo: st?.memo ?? "",
      };
    }
    return init;
  });

  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    updateStagesAction.bind(null, projectId),
    null,
  );

  // 保存成功したらヘッダーの集計・更新履歴の表示を読み込み直す
  const handled = useRef<ActionResult | null>(null);
  useEffect(() => {
    if (!state || handled.current === state) return;
    handled.current = state;
    if (state.ok) {
      notifyProjectDataChanged();
      router.refresh();
    }
  }, [state, router]);

  const setRow = (key: StageKey, patch: Partial<Row>) => {
    setRows((prev) => {
      const next = { ...prev[key], ...patch };
      // 「進行中」「完了」に変えたとき、日付が空なら今日を自動で入れる
      if (
        patch.status &&
        (patch.status === "in_progress" || patch.status === "done") &&
        next.date === ""
      ) {
        next.date = todayLocalISO();
      }
      return { ...prev, [key]: next };
    });
  };

  return (
    <form action={formAction}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500">
              <th className="py-1 pr-2 font-medium">工程</th>
              <th className="py-1 pr-2 font-medium">状態</th>
              <th className="py-1 pr-2 font-medium">日付</th>
              <th className="py-1 font-medium">メモ</th>
            </tr>
          </thead>
          <tbody>
            {STAGES.map((s, index) => {
              const row = rows[s.key];
              const def = statusDef(row.status);
              return (
                <tr key={s.key} className="border-t border-slate-100">
                  <th
                    scope="row"
                    className="whitespace-nowrap py-2 pr-2 text-left font-normal"
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="w-5 text-right text-xs tabular-nums text-slate-400">
                        {index + 1}.
                      </span>
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${def.dotClass}`}
                        aria-hidden
                      />
                      {s.label}
                    </span>
                  </th>
                  <td className="py-2 pr-2">
                    <select
                      name={`stage_status_${s.key}`}
                      value={row.status}
                      onChange={(e) => setRow(s.key, { status: e.target.value as StageStatus })}
                      aria-label={`「${s.label}」の状態`}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      {STATUSES.map((st) => (
                        <option key={st.key} value={st.key}>
                          {st.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="date"
                      name={`stage_date_${s.key}`}
                      value={row.date}
                      onChange={(e) => setRow(s.key, { date: e.target.value })}
                      aria-label={`「${s.label}」の日付`}
                      className="rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </td>
                  <td className="py-2">
                    <input
                      type="text"
                      name={`stage_memo_${s.key}`}
                      value={row.memo}
                      onChange={(e) => setRow(s.key, { memo: e.target.value })}
                      placeholder="任意"
                      aria-label={`「${s.label}」のメモ`}
                      className="w-full min-w-32 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {state && !state.ok && (
        <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state && state.ok && (
        <p role="status" className="mt-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          ✓ {state.message}
        </p>
      )}

      <div className="mt-3 flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
        >
          <Save className="h-4 w-4" aria-hidden />
          {pending ? "保存中…" : "工程の進捗を保存"}
        </button>
      </div>
    </form>
  );
}
