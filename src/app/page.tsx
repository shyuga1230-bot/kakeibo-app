// 登録画面(トップページ)。受注した見積もりを1件ずつ登録する。
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getItemNameSuggestions } from "@/lib/quotes";
import RegisterPanel from "@/components/RegisterPanel";
import BulkImport from "@/components/BulkImport";

export default async function RegisterPage() {
  if (!(await getSession())) redirect("/login");

  const suggestions = await getItemNameSuggestions();

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold">見積もりを登録する</h2>
        <p className="mt-1 text-sm text-slate-600">
          受注した見積もり1件分の内容を入力してください。登録したデータは全員で共有されます。
          Excelの見積書を貼り付けて自動入力することもできます。
        </p>
        <div className="mt-4">
          <RegisterPanel suggestions={suggestions} />
        </div>
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold">まとめて登録(貼り付け取込)</h2>
        <p className="mt-1 text-sm text-slate-600">
          Excelなどで作った一覧を貼り付けて、複数の見積もりを一度に登録できます。
        </p>
        <div className="mt-4">
          <BulkImport />
        </div>
      </section>
    </div>
  );
}
