"use client";
// 案件管理の一覧表(行=案件、列=13工程)。Excelの管理表と同じ並びで、
// セルの色で進捗が一目でわかる。セルを押すとその場で状態を変更できる。
// 他の人の更新が自動で反映されるよう、30秒ごと・保存後・タブ復帰時に
// 一覧データ(/api/projects/board)を読み直す。

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { RefreshCw, Search } from "lucide-react";
import { updateStageAction } from "@/app/projects/actions";
import type { ActionResult } from "@/app/actions";
import { PROJECT_DATA_CHANGED_EVENT, notifyProjectDataChanged } from "@/lib/events";
import { useAutoReload } from "@/lib/hooks";
import type { BoardProject } from "@/lib/project-board";
import { formatDate, formatMonthDay, todayLocalISO } from "@/lib/format";
import {
  PROJECT_PHASES,
  STAGES,
  STATUSES,
  countByPhase,
  dateAfterStatusChange,
  stageLabel,
  stageState,
  statusDef,
  type ProjectPhase,
  type StageKey,
} from "@/lib/project-stages";
import Dialog from "@/components/Dialog";

const AUTO_REFRESH_MS = 30_000;

/** 案件全体の状態を示す小さなラベル */
function PhaseChip({ phase }: { phase: ProjectPhase }) {
  const def = PROJECT_PHASES.find((p) => p.key === phase) ?? PROJECT_PHASES[0];
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${def.chipClass}`}
    >
      {def.label}
    </span>
  );
}

/** セルを押したときに開く、工程1マス分の編集ダイアログ */
function StageEditDialog({
  project,
  stageKey,
  onClose,
  onSaved,
}: {
  project: BoardProject;
  stageKey: StageKey;
  onClose: () => void;
  onSaved: () => void;
}) {
  const current = stageState(project.stages, stageKey);
  const [status, setStatus] = useState(current.status);
  const [date, setDate] = useState(current.date ?? "");
  const [memo, setMemo] = useState(current.memo ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const pickStatus = (next: (typeof STATUSES)[number]["key"]) => {
    setStatus(next);
    setDate(dateAfterStatusChange(next, date, todayLocalISO()));
  };

  const save = () => {
    startTransition(async () => {
      const result: ActionResult = await updateStageAction({
        projectId: project.id,
        stageKey,
        status,
        date,
        memo,
        // ダイアログを開いた時点の値。他の人が先に変更していたら保存せずに知らせてもらう
        expected: current,
      });
      if (result.ok) {
        onSaved();
      } else {
        setError(result.error);
        // 他の人の変更が原因の場合に備えて、ダイアログの後ろの一覧は最新にしておく
        notifyProjectDataChanged();
      }
    });
  };

  return (
    <Dialog
      titleId="stage-edit-dialog-title"
      pending={pending}
      onClose={onClose}
      header={
        <div className="min-w-0">
          <h3 id="stage-edit-dialog-title" className="text-base font-bold">
            {stageLabel(stageKey)}
          </h3>
          <p className="mt-0.5 break-words text-xs text-slate-500">
            {project.projectName}
            {project.clientName ? `(${project.clientName})` : ""}
          </p>
        </div>
      }
    >
      <fieldset className="mt-4">
        <legend className="text-sm font-medium text-slate-700">状態</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {STATUSES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => pickStatus(s.key)}
              aria-pressed={status === s.key}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                status === s.key
                  ? "border-blue-600 bg-blue-50 font-medium text-blue-900"
                  : "border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className={`h-3 w-3 shrink-0 rounded-full ${s.dotClass}`} aria-hidden />
              {s.label}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="mt-4 block text-sm font-medium text-slate-700">
        日付(完了日・着手日など)
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />
      </label>

      <label className="mt-3 block text-sm font-medium text-slate-700">
        メモ(任意)
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={2}
          placeholder="例: 成果品の修正待ち"
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />
      </label>

      {error && (
        <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? "保存中…" : "保存"}
        </button>
      </div>
    </Dialog>
  );
}

/** セルの中に表示する短い文字(日付があれば日付を優先) */
function cellText(status: string, date: string | null): string {
  if (date) return formatMonthDay(date);
  if (status === "done") return "✓";
  if (status === "in_progress") return "▶";
  if (status === "not_applicable") return "―";
  return "";
}

export default function ProjectBoard({ initialProjects }: { initialProjects: BoardProject[] }) {
  const [projects, setProjects] = useState(initialProjects);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<"all" | ProjectPhase>("all");
  const [editing, setEditing] = useState<{ project: BoardProject; stageKey: StageKey } | null>(
    null,
  );

  // 一覧データを読み直す。画面の再描画をNext.jsのルーターに頼らず、
  // APIから直接取得する(確実に反映されるように)。
  // 後から始めた読み込みを優先し、遅れて届いた古い応答は捨てる(保存直後の巻き戻り防止)。
  // 内容が前回と同じなら再描画もしない。
  const loadSeq = useRef(0);
  const lastBody = useRef<string | null>(null);
  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    try {
      const res = await fetch("/api/projects/board", { cache: "no-store" });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const body = await res.text();
      if (seq !== loadSeq.current) return;
      setLoadError(false);
      if (body === lastBody.current) return;
      lastBody.current = body;
      setProjects((JSON.parse(body) as { projects: BoardProject[] }).projects);
    } catch {
      if (seq !== loadSeq.current) return;
      setLoadError(true); // 直前のデータは残したまま、注意書きだけ出す
    }
  }, []);

  const manualRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // 他の人の更新を自動で反映する(30秒ごと+タブ復帰時+この画面での保存後)
  useAutoReload(load, { intervalMs: AUTO_REFRESH_MS, eventName: PROJECT_DATA_CHANGED_EVENT });

  const counts = useMemo(() => countByPhase(projects), [projects]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (phaseFilter !== "all" && p.phase !== phaseFilter) return false;
      if (q === "") return true;
      return [p.projectName, p.clientName ?? "", p.partnerName ?? "", p.memo ?? ""]
        .join("\n")
        .toLowerCase()
        .includes(q);
    });
  }, [projects, query, phaseFilter]);

  const phaseButton = (value: "all" | ProjectPhase, label: string, count: number) => (
    <button
      key={value}
      type="button"
      onClick={() => setPhaseFilter(value)}
      aria-pressed={phaseFilter === value}
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        phaseFilter === value
          ? "bg-blue-600 text-white"
          : "bg-white text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
      }`}
    >
      {label} {count}件
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="案件名・社名・協力会社で検索"
            aria-label="案件の検索"
            className="w-64 max-w-full rounded-md border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {phaseButton("all", "すべて", projects.length)}
          {PROJECT_PHASES.map((p) => phaseButton(p.key, p.label, counts[p.key]))}
        </div>
        <button
          type="button"
          onClick={manualRefresh}
          className="ml-auto flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          title="最新の状態に読み込み直します(30秒ごとに自動でも更新されます)"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
          今すぐ更新
        </button>
      </div>

      {loadError && (
        <p role="alert" className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          最新の一覧を読み込めませんでした。表示は少し前の状態です。通信環境を確認して「今すぐ更新」を押してください。
        </p>
      )}

      {/* 色の意味の凡例 */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        <span>セルを押すと状態を変更できます。</span>
        {STATUSES.map((s) => (
          <span key={s.key} className="flex items-center gap-1">
            <span className={`h-2.5 w-2.5 rounded-sm ${s.dotClass}`} aria-hidden />
            {s.label}
          </span>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-900/5">
          <p className="text-slate-600">
            {projects.length === 0
              ? "まだ案件が登録されていません。右上の「案件を追加」から最初の1件を登録してください。"
              : "条件に合う案件がありません。検索や絞り込みを変えてみてください。"}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-10 border-b border-slate-200 bg-white px-3 pb-2 pt-3 text-left align-bottom text-xs font-medium text-slate-500"
                >
                  案件({filtered.length}件)
                </th>
                {STAGES.map((s) => (
                  <th
                    key={s.key}
                    scope="col"
                    className="border-b border-l border-slate-100 px-0.5 pb-2 pt-3 align-bottom font-medium"
                  >
                    <span className="block break-all text-center text-[10px] leading-tight text-slate-600">
                      {s.label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <th
                    scope="row"
                    className="sticky left-0 z-10 w-48 min-w-44 max-w-56 border-b border-slate-100 bg-white px-3 py-2 text-left align-top font-normal"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <Link
                        href={`/projects/${p.id}`}
                        className="break-words text-sm font-medium text-blue-700 hover:underline"
                        title="案件の詳細(備考・更新履歴・まとめて編集)を開きます"
                      >
                        {p.projectName}
                      </Link>
                      <PhaseChip phase={p.phase} />
                    </div>
                    <p className="mt-0.5 break-words text-xs text-slate-500">
                      {p.clientName ?? "(社名なし)"}
                      {p.partnerName && (
                        <span className="text-slate-400"> / 協力: {p.partnerName}</span>
                      )}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <div className="h-1.5 w-full max-w-28 overflow-hidden rounded bg-slate-100">
                        <div
                          className="h-full rounded bg-green-500"
                          style={{ width: `${p.progress.percent}%` }}
                        />
                      </div>
                      <span className="whitespace-nowrap text-[10px] tabular-nums text-slate-500">
                        {p.progress.done}/{p.progress.applicable}
                      </span>
                    </div>
                  </th>
                  {STAGES.map((s) => {
                    const st = stageState(p.stages, s.key);
                    const def = statusDef(st.status);
                    return (
                      <td key={s.key} className="border-b border-l border-slate-100 p-0">
                        <button
                          type="button"
                          onClick={() => setEditing({ project: p, stageKey: s.key })}
                          className={`block h-12 w-full min-w-11 px-0.5 text-center text-[10px] leading-tight tabular-nums hover:opacity-70 ${def.cellClass}`}
                          title={`${p.projectName} / ${s.label}: ${def.label}${
                            st.date ? `(${formatDate(st.date)})` : ""
                          }${st.memo ? `\n${st.memo}` : ""}\n押すと変更できます`}
                          aria-label={`${p.projectName}の「${s.label}」を変更(現在: ${def.label}${
                            st.date ? ` ${formatDate(st.date)}` : ""
                          })`}
                        >
                          {cellText(st.status, st.date)}
                          {st.memo && (
                            <span className="block text-[9px] text-slate-400" aria-hidden>
                              メモ
                            </span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <StageEditDialog
          key={`${editing.project.id}-${editing.stageKey}`}
          project={editing.project}
          stageKey={editing.stageKey}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            // 自分の変更を一覧とヘッダーの集計に反映する
            notifyProjectDataChanged();
          }}
        />
      )}
    </div>
  );
}
