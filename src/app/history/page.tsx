// 履歴画面。登録済みの見積もりを新しい順に一覧表示する。
import Link from "next/link";
import { redirect } from "next/navigation";
import { Pencil, PenLine } from "lucide-react";
import { getSession } from "@/lib/session";
import { listQuotes } from "@/lib/quotes";
import { formatDate, formatYen } from "@/lib/format";
import DeleteQuoteButton from "@/components/DeleteQuoteButton";

export const metadata = { title: "履歴 | Ark 見積・案件データベース" };

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  if (!(await getSession())) redirect("/login");

  const params = await searchParams;
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  const page = Number.parseInt(rawPage ?? "1", 10) || 1;

  const { quotes, total, page: currentPage, pageCount } = await listQuotes(page);

  if (total === 0) {
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-900/5">
        <p className="text-slate-600">まだ見積もりが登録されていません。</p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-gradient-to-b from-blue-600 to-blue-700 shadow-sm shadow-blue-900/20 px-4 py-2 text-sm font-medium text-white hover:from-blue-700 hover:to-blue-800"
        >
          <PenLine className="h-4 w-4" aria-hidden />
          登録画面で最初の1件を登録する
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold">登録履歴</h2>
        <p className="text-sm text-slate-500">
          全{formatYen(total)}件(新しい順)
        </p>
      </div>

      <ul className="space-y-3">
        {quotes.map((q) => {
          const totalAmount = q.items.reduce((sum, i) => sum + (i.amount ?? 0), 0);
          const hasAmount = q.items.some((i) => i.amount != null);
          const description = `${formatDate(q.quoteDate)} ${
            q.customerName ?? "(顧客名なし)"
          }(${q.items.length}項目)`;
          return (
            <li key={q.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-bold tabular-nums">{formatDate(q.quoteDate)}</span>
                    <span className="text-sm text-slate-700">
                      {q.customerName ?? (
                        <span className="text-slate-400">(顧客名なし)</span>
                      )}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {q.items.map((item) => (
                      <span
                        key={item.id}
                        className="inline-flex max-w-full items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-800"
                      >
                        <span className="min-w-0 break-all">{item.itemName}</span>
                        {item.amount != null && (
                          <span className="shrink-0 tabular-nums text-blue-500">
                            ¥{formatYen(item.amount)}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                  {q.memo && (
                    <p className="mt-2 whitespace-pre-wrap break-words text-xs text-slate-500">
                      {q.memo}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="text-sm font-bold tabular-nums">
                    {hasAmount ? `¥${formatYen(totalAmount)}` : "金額未入力"}
                  </span>
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/history/${q.id}/edit`}
                      className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                      title="この見積もりの内容を変更します"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                      編集
                    </Link>
                    <DeleteQuoteButton quoteId={q.id} description={description} />
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {pageCount > 1 && (
        <nav className="flex items-center justify-center gap-2 pt-2" aria-label="ページ切り替え">
          {currentPage > 1 && (
            <Link
              href={`/history?page=${currentPage - 1}`}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              ← 前のページ
            </Link>
          )}
          <span className="text-sm tabular-nums text-slate-500">
            {currentPage} / {pageCount} ページ
          </span>
          {currentPage < pageCount && (
            <Link
              href={`/history?page=${currentPage + 1}`}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              次のページ →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
