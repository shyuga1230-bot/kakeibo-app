// 履歴画面。登録済みの見積もりを新しい順に一覧表示する。
// 検索(顧客名・商品名・メモ)と期間で絞り込みできる。
import Link from "next/link";
import { redirect } from "next/navigation";
import { Pencil, PenLine, Search, Trash2 } from "lucide-react";
import { getSession } from "@/lib/session";
import { listQuotes, type QuoteFilter } from "@/lib/quotes";
import { formatDate, formatYen } from "@/lib/format";
import DeleteQuoteButton from "@/components/DeleteQuoteButton";

export const metadata = { title: "履歴 | Ark 見積・案件データベース" };

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

/** 絞り込みを保ったままページ番号だけ変えたリンクを作る */
function pageLink(filter: QuoteFilter, page: number): string {
  const params = new URLSearchParams();
  if (filter.q) params.set("q", filter.q);
  if (filter.from) params.set("from", filter.from);
  if (filter.to) params.set("to", filter.to);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/history?${qs}` : "/history";
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string | string[];
    q?: string | string[];
    from?: string | string[];
    to?: string | string[];
  }>;
}) {
  if (!(await getSession())) redirect("/login");

  const params = await searchParams;
  const page = Number.parseInt(first(params.page), 10) || 1;
  const isoDate = (s: string) => (/^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "");
  const filter: QuoteFilter = {
    q: first(params.q).slice(0, 100) || undefined,
    from: isoDate(first(params.from)) || undefined,
    to: isoDate(first(params.to)) || undefined,
  };
  const filtering = Boolean(filter.q || filter.from || filter.to);

  const { quotes, total, page: currentPage, pageCount } = await listQuotes(page, filter);

  if (total === 0 && !filtering) {
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-900/5">
        <p className="text-slate-600">まだ見積もりが登録されていません。</p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <PenLine className="h-4 w-4" aria-hidden />
          登録画面で最初の1件を登録する
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold">登録履歴</h2>
        <div className="flex items-baseline gap-4">
          <p className="text-sm text-slate-500">
            {filtering ? `検索結果 ${formatYen(total)}件` : `全${formatYen(total)}件(新しい順)`}
          </p>
          <Link
            href="/trash"
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 hover:underline"
            title="削除した見積もり・案件を30日以内なら戻せます"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            ごみ箱
          </Link>
        </div>
      </div>

      {/* 検索・期間の絞り込み(入力してそのまま Enter でも検索できる) */}
      <form
        action="/history"
        className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-900/5"
      >
        <div className="relative min-w-0 flex-1 basis-52">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            name="q"
            defaultValue={filter.q ?? ""}
            placeholder="顧客名・商品名・メモで検索"
            aria-label="検索"
            className="w-full rounded-md border border-slate-300 py-1.5 pl-8 pr-3 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1 text-sm text-slate-500">
          <input
            type="date"
            name="from"
            defaultValue={filter.from ?? ""}
            aria-label="開始日"
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
          <span>〜</span>
          <input
            type="date"
            name="to"
            defaultValue={filter.to ?? ""}
            aria-label="終了日"
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          検索
        </button>
        {filtering && (
          <Link href="/history" className="text-sm text-blue-700 hover:underline">
            すべて表示
          </Link>
        )}
      </form>

      {quotes.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-900/5">
          <p className="text-slate-600">条件に合う見積もりが見つかりませんでした。</p>
          <p className="mt-1 text-sm text-slate-500">
            検索の言葉を短くするか、期間を広げてみてください。
          </p>
        </div>
      ) : (
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
                      {q.createdBy && (
                        <span className="text-xs text-slate-400">登録: {q.createdBy}</span>
                      )}
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
      )}

      {pageCount > 1 && (
        <nav className="flex items-center justify-center gap-2 pt-2" aria-label="ページ切り替え">
          {currentPage > 1 && (
            <Link
              href={pageLink(filter, currentPage - 1)}
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
              href={pageLink(filter, currentPage + 1)}
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
