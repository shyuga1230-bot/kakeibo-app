// 案件管理の一覧表。行=案件、列=13工程で、Excelの管理表と同じ並び。
// セルの色で全案件の進捗がリアルタイムに一目でわかる。
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listProjects } from "@/lib/projects";
import { listPartners } from "@/lib/partners";
import { toBoardProject } from "@/lib/project-board";
import ProjectBoard from "@/components/ProjectBoard";
import NewProjectButton from "@/components/NewProjectButton";
import ProjectsTabs from "@/components/ProjectsTabs";

export const metadata = { title: "案件管理 | 見積もり併売データベース" };

export default async function ProjectsPage() {
  if (!(await getSession())) redirect("/login");

  const [projects, partners] = await Promise.all([listProjects(), listPartners()]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ProjectsTabs active="board" />
        <NewProjectButton partners={partners} />
      </div>
      <ProjectBoard initialProjects={projects.map(toBoardProject)} />
    </div>
  );
}
