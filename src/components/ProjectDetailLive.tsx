"use client";
// 案件詳細ページの本体。状態・進捗・更新履歴は保存後・30秒ごと・タブ復帰時に
// API(/api/projects/[id])から読み直す(一覧表と同じ、確実に反映される方式)。
// 編集フォームの入力内容は読み直しの影響を受けない。

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PROJECT_DATA_CHANGED_EVENT } from "@/lib/events";
import { useAutoReload } from "@/lib/hooks";
import { formatDateTimeJst } from "@/lib/format";
import type { BoardProject } from "@/lib/project-board";
import type { Partner } from "@/lib/partners";
import { PROJECT_PHASE_LABELS, type ProjectPhase } from "@/lib/project-stages";
import ProjectEditForm from "@/components/ProjectEditForm";
import ProjectStageEditor from "@/components/ProjectStageEditor";
import DeleteProjectButton from "@/components/DeleteProjectButton";

const AUTO_REFRESH_MS = 30_000;

export type ProjectLogItem = { id: number; action: string; at: string };

type Live = {
  phase: ProjectPhase;
  progress: { done: number; applicable: number; percent: number };
  logs: ProjectLogItem[];
};

export default function ProjectDetailLive({
  project,
  partners,
  initialLogs,
}: {
  project: BoardProject;
  partners: Partner[];
  initialLogs: ProjectLogItem[];
}) {
  const [live, setLive] = useState<Live>({
    phase: project.phase,
    progress: project.progress,
    logs: initialLogs,
  });

  // 後から始めた読み込みを優先し、遅れて届いた古い応答は捨てる
  const loadSeq = useRef(0);
  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    try {
      const res = await fetch(`/api/projects/${project.id}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data: Live = await res.json();
      if (seq !== loadSeq.current) return;
      setLive(data);
    } catch {
      // 直前の表示を残す(次の自動更新で再試行される)
    }
  }, [project.id]);

  // 30秒ごと・タブ復帰時・この画面での保存後に状態と履歴を読み直す
  useAutoReload(load, { intervalMs: AUTO_REFRESH_MS, eventName: PROJECT_DATA_CHANGED_EVENT });

  const description = `「${project.projectName}」${
    project.clientName ? `(${project.clientName})` : ""
  }`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          一覧表に戻る
        </Link>
        <p className="text-sm text-slate-500">
          状態: {PROJECT_PHASE_LABELS[live.phase]} / 進捗 {live.progress.done}/
          {live.progress.applicable} 工程({live.progress.percent}%)
        </p>
      </div>

      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5 sm:p-6">
        <h2 className="text-lg font-bold">基本情報</h2>
        <p className="mt-1 text-sm text-slate-600">
          社名は顧客(施工会社)、協力会社はArkが業務を依頼する外注先です。
        </p>
        <div className="mt-4">
          <ProjectEditForm
            project={{
              id: project.id,
              clientName: project.clientName,
              partnerName: project.partnerName,
              projectName: project.projectName,
              memo: project.memo,
            }}
            partners={partners}
          />
        </div>
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5 sm:p-6">
        <h2 className="text-lg font-bold">工程の進捗</h2>
        <p className="mt-1 text-sm text-slate-600">
          「進行中」「完了」を選ぶと日付が自動で入ります(変更もできます)。
        </p>
        <div className="mt-4">
          <ProjectStageEditor projectId={project.id} stages={project.stages} />
        </div>
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5 sm:p-6">
        <h2 className="text-lg font-bold">更新履歴</h2>
        <p className="mt-1 text-sm text-slate-600">
          この案件に対する変更の記録です(新しい順・最新30件)。
        </p>
        {live.logs.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">まだ履歴がありません。</p>
        ) : (
          <ul className="mt-4 space-y-1.5">
            {live.logs.map((log) => (
              <li key={log.id} className="flex flex-wrap gap-x-3 text-sm">
                <span className="whitespace-nowrap tabular-nums text-slate-400">
                  {formatDateTimeJst(new Date(log.at))}
                </span>
                <span className="min-w-0 break-words text-slate-700">{log.action}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-red-100 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-base font-bold text-red-700">案件の削除</h2>
        <p className="mt-1 text-sm text-slate-600">
          間違えて登録した場合などに削除できます。削除すると元に戻せません。
        </p>
        <div className="mt-3">
          <DeleteProjectButton projectId={project.id} description={description} />
        </div>
      </section>
    </div>
  );
}
