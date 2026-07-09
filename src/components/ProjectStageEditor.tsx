"use client";
// 案件詳細ページの工程一覧。13工程の状態・日付・メモをまとめて編集して保存する。
// 画面を開いた時点の値(基準値)も一緒に送り、サーバー側は「自分が変えた工程だけ」を
// 保存する(他の人が同時に変えた工程を、古い値で上書きしてしまわないように)。

import { useActionState, useEffect, useRef, useState } from "react";
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

function toRows(stages: StageStateMap): Record<StageKey, Row> {
  const rows = {} as Record<StageKey, Row>;
  for (const s of STAGES) {
    const st = stages[s.key];
    rows[s.key] = {
      status: st?.status ?? "not_started",
      date: st?.date ?? "",
      memo: st?.memo ?? "",
    };
  }
  return rows;
}

export default function ProjectStageEditor({ projectId, stages }: Props) {
  const [rows, setRows] = useState<Record<StageKey, Row>>(() => toRows(stages));
  // 比較の基準値(画面を開いた時点の値。保存成功のたびに今の入力内容へ更新する)
  const baseline = useRef<Record<StageKey, Row>>(toRows(stages));
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    updateStagesAction.bind(null, projectId),
    null,
  );

  // 保存成功したらヘッダーの集計・更新履歴の表示を読み込み直してもらう
  const handled = useRef<ActionResult | null>(null);
  useEffect(() => {
    if (!state || handled.current === state) return;
    handled.current = state;
    if (state.ok) {
      baseline.current = rowsRef.current;
      notifyProjectDataChanged();
    }
  }, [state]);

  const setRow = (key: StageKey, patch: Partial<Row>) => {
    setRows((prev) => {
      const next = { ...prev[key], ...patch };
      if (patch.status) {
        if (
          (patch.status === "in_progress" || patch.status === "done") &&
          next.date === ""
        ) {
          // 「進行中」「完了」に変えたとき、日付が空なら今日を自動で入れる
          next.date = todayLocalISO();
        } else if (patch.status === "not_started" || patch.status === "not_applicable") {
          // 「未着手」「対象外」に戻したら日付は消す
          next.date = "";
        }
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
              const base = baseline.current[s.key];
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
                    {/* 画面を開いた時点の値。サーバー側で「変えた工程だけ保存」の判定に使う */}
                    <input type="hidden" name={`stage_base_status_${s.key}`} value={base.status} />
                    <input type="hidden" name={`stage_base_date_${s.key}`} value={base.date} />
                    <input type="hidden" name={`stage_base_memo_${s.key}`} value={base.memo} />
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
