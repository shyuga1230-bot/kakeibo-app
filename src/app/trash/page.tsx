// ごみ箱。削除した見積もり・案件を30日以内なら戻せる。
import Link from "next/link";
import { redirect } from "next/navigation";
import { Trash2 } from "lucide-react";
import { getSession } from "@/lib/session";
import { listTrash, TRASH_DAYS } from "@/lib/trash";
import { formatDate, toJstDateString } from "@/lib/format";
import TrashView from "@/components/TrashView";

export const metadata = { title: "ごみ箱 | Ark 見積・案件データベース" };

export default async function TrashPage() {
  if (!(await getSession())) redirect("/login");

  const { quotes, projects } = await listTrash();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Trash2 className="h-5 w-5 text-slate-400" aria-hidden />
          ごみ箱
        </h2>
        <p className="text-sm text-slate-500">
          削除から{TRASH_DAYS}日たつと自動的に完全に消えます。
        </p>
      </div>

      <TrashView
        quotes={quotes.map((q) => ({
          id: q.id,
          title: `${formatDate(q.quoteDate)} ${q.customerName ?? "(顧客名なし)"}`,
          subtitle: q.itemNames.join("、"),
          deletedAt: formatDate(toJstDateString(q.deletedAt)),
        }))}
        projects={projects.map((p) => ({
          id: p.id,
          title: p.projectName,
          subtitle: p.clientName ?? "(社名なし)",
          deletedAt: formatDate(toJstDateString(p.deletedAt)),
        }))}
      />

      <p className="text-sm">
        <Link href="/history" className="text-blue-700 hover:underline">
          ← 履歴に戻る
        </Link>
      </p>
    </div>
  );
}
