// 案件の詳細ページ。基本情報の編集、13工程のまとめて編集、更新履歴、削除。
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/session";
import { getProject, listLogs } from "@/lib/projects";
import { formatDateTimeJst } from "@/lib/format";
import { PROJECT_PHASE_LABELS } from "@/lib/project-stages";
import ProjectEditForm from "@/components/ProjectEditForm";
import ProjectStageEditor from "@/components/ProjectStageEditor";
import DeleteProjectButton from "@/components/DeleteProjectButton";

export const metadata = { title: "案件の詳細 | 見積もり併売データベース" };

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await getSession())) redirect("/login");

  const { id } = await params;
  const projectId = Number.parseInt(id, 10);
  if (!Number.isInteger(projectId) || projectId <= 0) notFound();

  const project = await getProject(projectId);
  if (!project) notFound();

  const logs = await listLogs(projectId);
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
          状態: {PROJECT_PHASE_LABELS[project.phase]} / 進捗 {project.progress.done}/
          {project.progress.applicable} 工程({project.progress.percent}%)
        </p>
      </div>

      <section className="rounded-xl bg-white p-4 shadow-sm sm:p-6">
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
          />
        </div>
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold">工程の進捗</h2>
        <p className="mt-1 text-sm text-slate-600">
          「進行中」「完了」を選ぶと日付が自動で入ります(変更もできます)。
        </p>
        <div className="mt-4">
          <ProjectStageEditor projectId={project.id} stages={project.stages} />
        </div>
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold">更新履歴</h2>
        <p className="mt-1 text-sm text-slate-600">
          この案件に対する変更の記録です(新しい順・最新30件)。
        </p>
        {logs.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">まだ履歴がありません。</p>
        ) : (
          <ul className="mt-4 space-y-1.5">
            {logs.map((log) => (
              <li key={log.id} className="flex flex-wrap gap-x-3 text-sm">
                <span className="whitespace-nowrap tabular-nums text-slate-400">
                  {formatDateTimeJst(log.createdAt)}
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
