// 商品管理画面。よく売る商品・サービスを登録しておくと、
// 見積もり登録のときにボタン一発で項目に追加できる。
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listMasterItemsWithSales } from "@/lib/items";
import ItemMasterManager from "@/components/ItemMasterManager";
import ItemMergeForm from "@/components/ItemMergeForm";

export const metadata = { title: "商品管理 | Ark 見積・案件データベース" };

export default async function ItemsPage() {
  if (!(await getSession())) redirect("/login");

  const items = await listMasterItemsWithSales();

  return (
    <div className="space-y-4">
      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5 sm:p-6">
        <h2 className="text-lg font-bold">商品管理</h2>
        <p className="mt-1 text-sm text-slate-600">
          よく売る商品・サービスをここに登録しておくと、見積もりの登録画面で
          <b>ボタンを押すだけ</b>で項目に追加できるようになります。
          色つきのラベルは、その商品がどれくらい売れているか(登録件数の度合い)を表します。
        </p>
        <div className="mt-4">
          <ItemMasterManager items={items} />
        </div>
      </section>

      {items.length >= 2 && (
        <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5 sm:p-6">
          <h2 className="text-base font-bold">商品の統合(名寄せ)</h2>
          <p className="mt-1 text-sm text-slate-600">
            「3次元起工測量」と「3D起工測量」のように<b>同じ商品が別の名前で増えてしまった</b>とき、
            1つにまとめられます。過去の見積もりの名前も書き換わり、売上・併売の集計もまとまります。
          </p>
          <div className="mt-3">
            <ItemMergeForm
              items={items.map((i) => ({ name: i.name, salesCount: i.salesCount }))}
            />
          </div>
        </section>
      )}
    </div>
  );
}
