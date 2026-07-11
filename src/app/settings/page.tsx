// 自社情報の設定ページ。ここで入れた内容が納品書・請求書に印字される。
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/session";
import { getCompany } from "@/lib/company";
import CompanyForm from "@/components/CompanyForm";

export const metadata = { title: "自社情報 | Ark 見積・案件データベース" };

export default async function SettingsPage() {
  if (!(await getSession())) redirect("/login");

  const company = await getCompany();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/documents"
          className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          書類一覧へ
        </Link>
        <h2 className="text-lg font-bold">自社情報の設定</h2>
      </div>

      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5 sm:p-6">
        <p className="text-sm text-slate-600">
          ここで入れた内容が、納品書・請求書の右上に<b>そのまま印字されます</b>。
          一度設定すれば全員の書類に反映されます。
        </p>
        <div className="mt-4">
          <CompanyForm company={company} />
        </div>
      </section>
    </div>
  );
}
