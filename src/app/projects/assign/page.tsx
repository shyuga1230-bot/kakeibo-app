// 振分け画面。協力会社ごとの担当件数を見ながら、案件を満遍なく割り当てる。
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listProjects } from "@/lib/projects";
import { listPartners } from "@/lib/partners";
import { toBoardProject } from "@/lib/project-board";
import ProjectsTabs from "@/components/ProjectsTabs";
import AssignView from "@/components/AssignView";

export const metadata = { title: "振分け | Ark 見積・案件データベース" };

export default async function AssignPage() {
  if (!(await getSession())) redirect("/login");

  const [projects, partners] = await Promise.all([listProjects(), listPartners()]);

  return (
    <div className="space-y-4">
      <ProjectsTabs active="assign" />
      <AssignView
        initialProjects={projects.map(toBoardProject)}
        initialPartners={partners}
      />
    </div>
  );
}
