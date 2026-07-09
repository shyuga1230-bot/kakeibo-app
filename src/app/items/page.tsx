// 商品管理画面。よく売る商品・サービスを登録しておくと、
// 見積もり登録のときにボタン一発で項目に追加できる。
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listMasterItems } from "@/lib/items";
import ItemMasterManager from "@/components/ItemMasterManager";

export const metadata = { title: "商品管理 | Ark 見積・案件データベース" };

export default async function ItemsPage() {
  if (!(await getSession())) redirect("/login");

  const items = await listMasterItems();

  return (
    <div className="space-y-4">
      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5 sm:p-6">
        <h2 className="text-lg font-bold">商品管理</h2>
        <p className="mt-1 text-sm text-slate-600">
          よく売る商品・サービスをここに登録しておくと、見積もりの登録画面で
          <b>ボタンを押すだけ</b>で項目に追加できるようになります。
          標準金額を設定すると、金額も自動で入ります(登録のつど変更できます)。
        </p>
        <div className="mt-4">
          <ItemMasterManager items={items} />
        </div>
      </section>
    </div>
  );
}
