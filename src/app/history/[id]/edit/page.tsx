// 登録済みの見積もりの編集画面。登録フォームを編集モードで使い回す。
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/session";
import { getQuote } from "@/lib/quotes";
import { listMasterItems } from "@/lib/items";
import QuoteForm from "@/components/QuoteForm";

export const metadata = { title: "見積もりの編集 | Ark 見積・案件データベース" };

export default async function EditQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await getSession())) redirect("/login");

  const { id } = await params;
  const quoteId = Number.parseInt(id, 10);
  if (!Number.isInteger(quoteId) || quoteId <= 0) notFound();

  const [quote, masterItems] = await Promise.all([
    getQuote(quoteId),
    listMasterItems(),
  ]);
  if (!quote) notFound();

  return (
    <div className="space-y-4">
      <Link
        href="/history"
        className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        履歴に戻る(保存しない)
      </Link>
      <section className="rounded-xl bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold">見積もりを編集する</h2>
        <p className="mt-1 text-sm text-slate-600">
          変更内容は「変更を保存する」を押した時点で全員のデータに反映されます。
        </p>
        <div className="mt-4">
          <QuoteForm
            masterItems={masterItems}
            edit={{
              quoteId: quote.id,
              quoteDate: quote.quoteDate,
              customerName: quote.customerName ?? "",
              memo: quote.memo ?? "",
              items: quote.items.map((i) => ({
                name: i.itemName,
                amount: i.amount == null ? "" : String(i.amount),
              })),
            }}
          />
        </div>
      </section>
    </div>
  );
}
