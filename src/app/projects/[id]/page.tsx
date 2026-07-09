// 案件の詳細ページ。基本情報の編集、13工程のまとめて編集、更新履歴、削除。
// 画面の組み立てと自動更新は ProjectDetailLive(クライアント部品)が行う。
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getProject, listLogs } from "@/lib/projects";
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

  const project = await getProject(projectId);
  if (!project) notFound();

  const logs = await listLogs(projectId);

  return (
    <ProjectDetailLive
      project={{
        id: project.id,
        clientName: project.clientName,
        partnerName: project.partnerName,
        projectName: project.projectName,
        memo: project.memo,
        phase: project.phase,
        progress: project.progress,
        stages: project.stages,
      }}
      initialLogs={logs.map((l) => ({
        id: l.id,
        action: l.action,
        at: l.createdAt.toISOString(),
      }))}
    />
  );
}
