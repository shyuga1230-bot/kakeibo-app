// 案件管理の一覧表。行=案件、列=13工程で、Excelの管理表と同じ並び。
// セルの色で全案件の進捗がリアルタイムに一目でわかる。
import Link from "next/link";
import { redirect } from "next/navigation";
import { Trash2 } from "lucide-react";
import { getSession } from "@/lib/session";
import { listProjects } from "@/lib/projects";
import { listPartners } from "@/lib/partners";
import { toBoardProject } from "@/lib/project-board";
import ProjectBoard from "@/components/ProjectBoard";
import NewProjectButton from "@/components/NewProjectButton";
import ProjectsTabs from "@/components/ProjectsTabs";

export const metadata = { title: "案件管理 | Ark 見積・案件データベース" };

export default async function ProjectsPage() {
  if (!(await getSession())) redirect("/login");

  const [projects, partners] = await Promise.all([listProjects(), listPartners()]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ProjectsTabs active="board" />
        <div className="flex items-center gap-3">
          <Link
            href="/trash"
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 hover:underline"
            title="削除した案件を30日以内なら戻せます"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            ごみ箱
          </Link>
          <NewProjectButton partners={partners} />
        </div>
      </div>
      <ProjectBoard initialProjects={projects.map(toBoardProject)} />
    </div>
  );
}
