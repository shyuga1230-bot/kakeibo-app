// 登録画面(トップページ)。受注した見積もりを1件ずつ登録する。
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listMasterItems } from "@/lib/items";
import RegisterPanel from "@/components/RegisterPanel";
import BulkImport from "@/components/BulkImport";

export default async function RegisterPage() {
  if (!(await getSession())) redirect("/login");

  const masterItems = await listMasterItems();

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5 sm:p-6">
        <h2 className="text-lg font-bold">見積もりを登録する</h2>
        <p className="mt-1 text-sm text-slate-600">
          受注した見積もりを1件ずつ登録します(全員で共有されます)。
        </p>
        <div className="mt-4">
          <RegisterPanel
            masterItems={masterItems}
            aiEnabled={Boolean(process.env.ANTHROPIC_API_KEY)}
          />
        </div>
      </section>

      {/* 使う頻度が低いので、ふだんは折りたたんでおく */}
      <details className="group rounded-xl bg-white shadow-sm ring-1 ring-slate-900/5">
        <summary className="cursor-pointer list-none p-4 sm:px-6">
          <span className="text-lg font-bold">まとめて登録(一覧の貼り付け)</span>
          <span className="ml-2 text-sm text-slate-500 group-open:hidden">押すと開きます</span>
        </summary>
        <div className="px-4 pb-4 sm:px-6 sm:pb-6">
          <p className="text-sm text-slate-600">
            Excelなどで作った一覧を貼り付けて、複数の見積もりを一度に登録できます。
          </p>
          <div className="mt-4">
            <BulkImport />
          </div>
        </div>
      </details>
    </div>
  );
}
