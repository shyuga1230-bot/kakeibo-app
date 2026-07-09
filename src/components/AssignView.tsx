"use client";
// 振分け画面。協力会社ごとの担当件数(完了していない案件の数)を見ながら、
// 未割り当ての案件を件数の少ない会社へ割り当てる。割り当て済みの変更もできる。
// 協力会社マスタ(振分け先の候補)の管理もこの画面で行う。

import { useActionState, useCallback, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { CirclePlus, Download, Pencil, Save, Scale, Trash2, X } from "lucide-react";
import {
  assignPartnerAction,
  createPartnerAction,
  deletePartnerAction,
  importPartnersAction,
  updatePartnerAction,
} from "@/app/projects/actions";
import type { ActionResult } from "@/app/actions";
import { PROJECT_DATA_CHANGED_EVENT, notifyProjectDataChanged } from "@/lib/events";
import { useActionSuccess, useAutoReload } from "@/lib/hooks";
import type { BoardProject } from "@/lib/project-board";
import type { Partner } from "@/lib/partners";
import { activeCountByPartner, leastLoadedPartner, sortPartnersByLoad } from "@/lib/assign";
import { PROJECT_PHASES, type ProjectPhase } from "@/lib/project-stages";
import ActionMessage from "@/components/ActionMessage";

const AUTO_REFRESH_MS = 30_000;

function PhaseChip({ phase }: { phase: ProjectPhase }) {
  const def = PROJECT_PHASES.find((p) => p.key === phase) ?? PROJECT_PHASES[0];
  return (
    <span
      className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${def.chipClass}`}
    >
      {def.label}
    </span>
  );
}

/** 案件1件分の割り当て行(未割り当て・割り当て済みで共通) */
function AssignRow({
  project,
  partners,
  counts,
  defaultChoice,
}: {
  project: BoardProject;
  partners: Partner[];
  counts: Map<string | null, number>;
  defaultChoice: string;
}) {
  const [choice, setChoice] = useState(defaultChoice);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const current = project.partnerName ?? "";
  const sorted = sortPartnersByLoad(partners, counts);

  const submit = () => {
    startTransition(async () => {
      const result = await assignPartnerAction(project.id, choice === "" ? null : choice);
      if (result.ok) {
        setError(null);
        notifyProjectDataChanged(); // 一覧・件数・ヘッダーの集計に反映
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <li className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/projects/${project.id}`}
              className="break-words text-sm font-medium text-blue-700 hover:underline"
            >
              {project.projectName}
            </Link>
            <PhaseChip phase={project.phase} />
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            {project.clientName ?? "(社名なし)"} / 進捗 {project.progress.done}/
            {project.progress.applicable}
          </p>
        </div>
        <select
          value={choice}
          onChange={(e) => setChoice(e.target.value)}
          aria-label={`「${project.projectName}」の協力会社`}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">(指定なし)</option>
          {current !== "" && !partners.some((p) => p.name === current) && (
            <option value={current}>{current}</option>
          )}
          {sorted.map((p) => (
            <option key={p.id} value={p.name}>
              {p.name}(いま{counts.get(p.name) ?? 0}件)
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={submit}
          disabled={pending || choice === current}
          className="rounded-md bg-gradient-to-b from-blue-600 to-blue-700 shadow-sm shadow-blue-900/20 px-3 py-1.5 text-sm font-medium text-white hover:from-blue-700 hover:to-blue-800 disabled:opacity-50"
        >
          {pending ? "保存中…" : current === "" ? "割り当てる" : "変更"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </li>
  );
}

/** 協力会社マスタの1行(表示・名前の変更・削除) */
function PartnerRow({ partner, activeCount }: { partner: Partner; activeCount: number }) {
  const [editing, setEditing] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pendingDelete, startDelete] = useTransition();

  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    updatePartnerAction.bind(null, partner.id),
    null,
  );
  useActionSuccess(state, () => {
    setEditing(false);
    notifyProjectDataChanged();
  });

  const confirmDelete = () => {
    if (
      !window.confirm(
        `「${partner.name}」を協力会社から削除しますか?\n(すでに割り当て済みの案件のデータは変わりません)`,
      )
    ) {
      return;
    }
    startDelete(async () => {
      const result = await deletePartnerAction(partner.id);
      if (result.ok) notifyProjectDataChanged();
      else setDeleteError(result.error);
    });
  };

  if (editing) {
    return (
      <li className="rounded-lg border border-blue-200 bg-blue-50/40 p-2">
        <form action={formAction} className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            name="name"
            defaultValue={partner.name}
            required
            aria-label="会社名"
            className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={pending}
            className="flex items-center gap-1 rounded-md bg-gradient-to-b from-blue-600 to-blue-700 shadow-sm shadow-blue-900/20 px-3 py-1.5 text-sm font-medium text-white hover:from-blue-700 hover:to-blue-800 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" aria-hidden />
            {pending ? "保存中…" : "保存"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            やめる
          </button>
          {state && !state.ok && (
            <p role="alert" className="w-full text-sm text-red-700">
              {state.error}
            </p>
          )}
        </form>
        <p className="mt-1 text-xs text-slate-500">
          ※名前を変えても、割り当て済みの案件の会社名は変わりません。
        </p>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5">
      <span className="min-w-0 break-words text-sm">
        {partner.name}
        <span className="ml-2 text-xs tabular-nums text-slate-500">いま{activeCount}件</span>
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-blue-50 hover:text-blue-700"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          編集
        </button>
        <button
          type="button"
          onClick={confirmDelete}
          disabled={pendingDelete}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          削除
        </button>
      </span>
      {deleteError && (
        <p role="alert" className="w-full text-sm text-red-700">
          {deleteError}
        </p>
      )}
    </li>
  );
}

/** 協力会社マスタの管理(追加・取り込み・一覧) */
function PartnerManager({
  partners,
  counts,
}: {
  partners: Partner[];
  counts: Map<string | null, number>;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    createPartnerAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  useActionSuccess(state, () => {
    formRef.current?.reset();
    notifyProjectDataChanged();
  });

  const [importResult, setImportResult] = useState<ActionResult | null>(null);
  const [importing, startImport] = useTransition();
  const runImport = () => {
    startImport(async () => {
      const result = await importPartnersAction();
      setImportResult(result);
      if (result.ok) notifyProjectDataChanged();
    });
  };

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5 sm:p-6">
      <h2 className="text-base font-bold">協力会社の管理</h2>
      <p className="mt-1 text-xs text-slate-500">
        振分け先の候補になる会社の一覧です。担当ゼロの会社もここに登録しておくと候補に出ます。
      </p>

      <form ref={formRef} action={formAction} className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="text"
          name="name"
          required
          placeholder="会社名(例: ○○測量)"
          aria-label="追加する会社名"
          className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="flex items-center gap-1 rounded-md bg-gradient-to-b from-blue-600 to-blue-700 shadow-sm shadow-blue-900/20 px-3 py-1.5 text-sm font-medium text-white hover:from-blue-700 hover:to-blue-800 disabled:opacity-50"
        >
          <CirclePlus className="h-4 w-4" aria-hidden />
          {pending ? "登録中…" : "追加"}
        </button>
        <button
          type="button"
          onClick={runImport}
          disabled={importing}
          title="すでに案件に入力されている協力会社名をまとめて登録します"
          className="flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <Download className="h-4 w-4" aria-hidden />
          {importing ? "取り込み中…" : "案件から取り込む"}
        </button>
      </form>
      <div className="mt-2 space-y-2 empty:hidden">
        <ActionMessage result={state && !state.ok ? state : null} />
        <ActionMessage result={importResult} />
      </div>

      {partners.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          まだ協力会社が登録されていません。上の欄から追加するか、「案件から取り込む」を押してください。
        </p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {partners.map((p) => (
            <PartnerRow key={p.id} partner={p} activeCount={counts.get(p.name) ?? 0} />
          ))}
        </ul>
      )}
    </section>
  );
}

export default function AssignView({
  initialProjects,
  initialPartners,
}: {
  initialProjects: BoardProject[];
  initialPartners: Partner[];
}) {
  const [projects, setProjects] = useState(initialProjects);
  const [partners, setPartners] = useState(initialPartners);

  // 後から始めた読み込みを優先し、遅れて届いた古い応答は捨てる
  const loadSeq = useRef(0);
  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    try {
      const [boardRes, partnersRes] = await Promise.all([
        fetch("/api/projects/board", { cache: "no-store" }),
        fetch("/api/partners", { cache: "no-store" }),
      ]);
      if (!boardRes.ok || !partnersRes.ok) throw new Error("load failed");
      const board: { projects: BoardProject[] } = await boardRes.json();
      const master: { partners: Partner[] } = await partnersRes.json();
      if (seq !== loadSeq.current) return;
      setProjects(board.projects);
      setPartners(master.partners);
    } catch {
      // 直前の表示を残す(次の自動更新で再試行される)
    }
  }, []);

  // 30秒ごと・タブ復帰時・この画面での操作後に読み直す
  useAutoReload(load, { intervalMs: AUTO_REFRESH_MS, eventName: PROJECT_DATA_CHANGED_EVENT });

  const counts = activeCountByPartner(projects);
  const sortedPartners = sortPartnersByLoad(partners, counts);
  const maxCount = Math.max(1, ...sortedPartners.map((p) => counts.get(p.name) ?? 0));
  const suggested = leastLoadedPartner(partners, counts);

  const active = projects.filter((p) => p.phase !== "done");
  const unassigned = active
    .filter((p) => !p.partnerName)
    .sort((a, b) => a.id - b.id); // 古い案件から順に割り当てる
  const assigned = active.filter((p) => p.partnerName);
  // 担当件数の少ない会社の案件が上に来るように並べる(配り直しの目安)
  const assignedSorted = [...assigned].sort(
    (a, b) =>
      (counts.get(b.partnerName) ?? 0) - (counts.get(a.partnerName) ?? 0) || a.id - b.id,
  );

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Scale className="h-5 w-5 text-blue-700" aria-hidden />
          協力会社ごとの担当状況
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          完了していない案件の数です。棒が短い会社に余裕があります。
        </p>
        {sortedPartners.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            協力会社が登録されると、ここに担当状況が表示されます(下の「協力会社の管理」から登録できます)。
          </p>
        ) : (
          <div className="mt-4 space-y-1.5">
            {sortedPartners.map((p) => {
              const count = counts.get(p.name) ?? 0;
              return (
                <div key={p.id} className="flex items-center gap-2">
                  <span className="w-36 shrink-0 truncate text-right text-xs text-slate-600">
                    {p.name}
                  </span>
                  <div className="h-4 flex-1 rounded bg-slate-50">
                    <div
                      className="h-full rounded bg-gradient-to-r from-blue-500 to-indigo-600"
                      style={{ width: `${(count / maxCount) * 100}%` }}
                      role="img"
                      aria-label={`${p.name}の担当 ${count}件`}
                    />
                  </div>
                  <span
                    className={`w-10 shrink-0 text-right text-xs tabular-nums ${
                      count === 0 ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    {count}件
                  </span>
                </div>
              );
            })}
            {(counts.get(null) ?? 0) > 0 && (
              <p className="pt-1 text-xs text-amber-700">
                未割り当ての案件が {counts.get(null)}件 あります(下で割り当てられます)。
              </p>
            )}
          </div>
        )}
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5 sm:p-6">
        <h2 className="text-lg font-bold">未割り当ての案件</h2>
        <p className="mt-1 text-sm text-slate-600">
          {suggested
            ? `いま余裕があるのは「${suggested.name}」です。選択肢は件数の少ない順に並んでいます。`
            : "協力会社を登録すると、件数の少ない会社から順に候補が並びます。"}
        </p>
        {unassigned.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            未割り当ての案件はありません。すべて振分け済みです。
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {unassigned.map((p) => (
              <AssignRow
                key={p.id}
                project={p}
                partners={partners}
                counts={counts}
                defaultChoice={suggested?.name ?? ""}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5 sm:p-6">
        <h2 className="text-lg font-bold">割り当て済みの案件(完了前)</h2>
        <p className="mt-1 text-sm text-slate-600">
          偏りを直したいときは、ここで担当を変更できます。件数の多い会社の案件が上に並びます。
        </p>
        {assignedSorted.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">割り当て済みの案件はまだありません。</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {assignedSorted.map((p) => (
              <AssignRow
                key={p.id}
                project={p}
                partners={partners}
                counts={counts}
                defaultChoice={p.partnerName ?? ""}
              />
            ))}
          </ul>
        )}
      </section>

      <PartnerManager partners={sortedPartners} counts={counts} />
    </div>
  );
}
