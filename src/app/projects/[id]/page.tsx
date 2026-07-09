// 案件の詳細ページ。基本情報の編集、13工程のまとめて編集、更新履歴、削除。
// 画面の組み立てと自動更新は ProjectDetailLive(クライアント部品)が行う。
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getProject, listLogs } from "@/lib/projects";
import { toBoardProject } from "@/lib/project-board";
import ProjectDetailLive from "@/components/ProjectDetailLive";

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

  const [project, logs] = await Promise.all([getProject(projectId), listLogs(projectId)]);
  if (!project) notFound();

  return (
    <ProjectDetailLive
      project={toBoardProject(project)}
      initialLogs={logs.map((l) => ({
        id: l.id,
        action: l.action,
        at: l.createdAt.toISOString(),
      }))}
    />
  );
}
