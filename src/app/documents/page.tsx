// 書類(納品書・請求書)の一覧ページ。
// 上部に請求額の集計と「まだ請求書を作っていない受注」、下に書類の一覧を表示する。
import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Pencil, Search, Trash2, TriangleAlert } from "lucide-react";
import { getSession } from "@/lib/session";
import { getCompany } from "@/lib/company";
import { getDocSummary, listDocuments, type DocumentFilter } from "@/lib/documents";
import { DOC_TYPES, isDocType } from "@/lib/document-calc";
import { formatDate, formatYen } from "@/lib/format";
import CreateDocumentButton from "@/components/CreateDocumentButton";

export const metadata = { title: "書類 | Ark 見積・案件データベース" };

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

function pageLink(filter: DocumentFilter, page: number): string {
  const params = new URLSearchParams();
  if (filter.type) params.set("type", filter.type);
  if (filter.q) params.set("q", filter.q);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/documents?${qs}` : "/documents";
}

const TYPE_BADGE = {
  invoice: "bg-blue-100 text-blue-800",
  delivery: "bg-emerald-100 text-emerald-800",
} as const;

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string | string[];
    q?: string | string[];
    page?: string | string[];
  }>;
}) {
  if (!(await getSession())) redirect("/login");

  const params = await searchParams;
  const typeRaw = first(params.type);
  const filter: DocumentFilter = {
    type: isDocType(typeRaw) ? typeRaw : undefined,
    q: first(params.q).slice(0, 100) || undefined,
  };
  const page = Number.parseInt(first(params.page), 10) || 1;

  const [summary, list, company] = await Promise.all([
    getDocSummary(),
    listDocuments(page, filter),
    getCompany(),
  ]);
  const filtering = Boolean(filter.type || filter.q);
  const shownUninvoiced = summary.uninvoiced.slice(0, 8);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold">書類(納品書・請求書)</h2>
        <div className="flex items-baseline gap-4">
          <Link
            href="/settings"
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 hover:underline"
            title="書類に印字される会社名・住所・振込先を設定します"
          >
            <Building2 className="h-3.5 w-3.5" aria-hidden />
            自社情報の設定
          </Link>
          <Link
            href="/trash"
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 hover:underline"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            ごみ箱
          </Link>
        </div>
      </div>

      {company.name === "" && (
        <p className="flex flex-wrap items-center gap-1.5 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
          自社情報がまだ設定されていないため、書類に会社名や振込先が印字されません。
          <Link href="/settings" className="font-medium text-amber-900 underline">
            自社情報を設定する
          </Link>
        </p>
      )}

      {/* 請求の集計 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
          <p className="text-xs text-slate-500">今月の請求額(税込)</p>
          <p className="mt-1 text-xl font-bold tabular-nums">¥{formatYen(summary.monthTotal)}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
          <p className="text-xs text-slate-500">今年の請求額(税込)</p>
          <p className="mt-1 text-xl font-bold tabular-nums">¥{formatYen(summary.yearTotal)}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
          <p className="text-xs text-slate-500">未請求の受注(今年の見積もりで請求書がまだ無いもの)</p>
          <p className="mt-1 text-xl font-bold tabular-nums">
            {summary.uninvoiced.length}件
            <span className="ml-2 text-sm font-medium text-slate-500">
              ¥{formatYen(summary.uninvoicedTotal)}
              <span className="text-xs">(税抜)</span>
            </span>
          </p>
        </div>
      </div>

      {/* 新しく作る */}
      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-2 text-sm font-medium">白紙から作る:</p>
          <CreateDocumentButton type="invoice" label="請求書を作る" />
          <CreateDocumentButton type="delivery" label="納品書を作る" />
          <p className="w-full text-xs text-slate-500 sm:ml-2 sm:w-auto">
            見積もりから作る場合は「履歴」の各見積もりのボタンか、下の未請求の一覧から。
          </p>
        </div>
      </section>

      {/* 未請求の受注 */}
      {summary.uninvoiced.length > 0 && (
        <details className="group rounded-xl bg-white shadow-sm ring-1 ring-slate-900/5" open>
          <summary className="cursor-pointer list-none p-4">
            <span className="text-base font-bold">
              未請求の受注({summary.uninvoiced.length}件)
            </span>
            <span className="ml-2 text-xs text-slate-500">
              請求書を作るとこの一覧から消えます
            </span>
          </summary>
          <ul className="space-y-2 px-4 pb-4">
            {shownUninvoiced.map((q) => (
              <li
                key={q.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm">
                    <span className="font-medium tabular-nums">{formatDate(q.quoteDate)}</span>
                    <span className="ml-2">{q.customerName ?? "(顧客名なし)"}</span>
                  </p>
                  {q.memo && <p className="truncate text-xs text-slate-500">{q.memo}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-medium tabular-nums">¥{formatYen(q.amount)}</span>
                  <CreateDocumentButton type="invoice" quoteId={q.id} label="請求書を作る" small />
                </div>
              </li>
            ))}
            {summary.uninvoiced.length > shownUninvoiced.length && (
              <li className="px-1 text-xs text-slate-500">
                他 {summary.uninvoiced.length - shownUninvoiced.length} 件は「履歴」から作れます。
              </li>
            )}
          </ul>
        </details>
      )}

      {/* 絞り込み */}
      <form
        action="/documents"
        className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-900/5"
      >
        <select
          name="type"
          defaultValue={filter.type ?? ""}
          aria-label="書類の種類"
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">すべての種類</option>
          <option value="invoice">請求書</option>
          <option value="delivery">納品書</option>
        </select>
        <div className="relative min-w-0 flex-1 basis-52">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            name="q"
            defaultValue={filter.q ?? ""}
            placeholder="宛名・件名・番号で検索"
            aria-label="書類の検索"
            className="w-full rounded-md border border-slate-300 py-1.5 pl-8 pr-3 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          検索
        </button>
        {filtering && (
          <Link href="/documents" className="text-sm text-blue-700 hover:underline">
            すべて表示
          </Link>
        )}
      </form>

      {/* 一覧 */}
      {list.documents.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-900/5">
          <p className="text-slate-600">
            {filtering
              ? "条件に合う書類が見つかりませんでした。"
              : "まだ書類がありません。上のボタンか「履歴」の見積もりから作れます。"}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {list.documents.map((d) => (
            <li
              key={d.id}
              className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-900/5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[d.type]}`}
                  >
                    {DOC_TYPES[d.type].label}
                  </span>
                  <Link
                    href={`/documents/${d.id}`}
                    className="font-medium tabular-nums text-blue-700 hover:underline"
                  >
                    No. {d.docNumber}
                  </Link>
                  <span className="text-sm tabular-nums text-slate-500">
                    {formatDate(d.issueDate)}
                  </span>
                  <span className="text-sm">{d.customerName || "(宛名なし)"}</span>
                  {d.subject && (
                    <span className="max-w-60 truncate text-xs text-slate-500">{d.subject}</span>
                  )}
                  {d.createdBy && (
                    <span className="text-xs text-slate-400">作成: {d.createdBy}</span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-bold tabular-nums">¥{formatYen(d.total)}</span>
                  <Link
                    href={`/documents/${d.id}`}
                    className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    開く
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {list.pageCount > 1 && (
        <nav className="flex items-center justify-center gap-2 pt-2" aria-label="ページ切り替え">
          {list.page > 1 && (
            <Link
              href={pageLink(filter, list.page - 1)}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              ← 前のページ
            </Link>
          )}
          <span className="text-sm tabular-nums text-slate-500">
            {list.page} / {list.pageCount} ページ
          </span>
          {list.page < list.pageCount && (
            <Link
              href={pageLink(filter, list.page + 1)}
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
