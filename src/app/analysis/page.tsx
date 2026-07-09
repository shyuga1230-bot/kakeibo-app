// 売上分析(分析 → 売上タブ)。月別の売上高グラフと、
// 月ごとの売れ筋ランキングを1年分まとめて表示する。
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, PenLine } from "lucide-react";
import { getSession } from "@/lib/session";
import { loadQuotesForSales } from "@/lib/quotes";
import { availableYears, computeYearlySales } from "@/lib/sales";
import { formatYen, formatYenCompact } from "@/lib/format";
import AnalysisTabs from "@/components/AnalysisTabs";

export const metadata = { title: "売上分析 | Ark 見積・案件データベース" };

/** 月ごとのランキングに表示する項目数 */
const RANKING_SIZE = 5;

function yearLink(year: number) {
  return `/analysis?year=${year}`;
}

function itemLink(name: string) {
  return `/analysis/cosales?item=${encodeURIComponent(name)}`;
}

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string | string[] }>;
}) {
  if (!(await getSession())) redirect("/login");

  const params = await searchParams;
  const rawYear = Array.isArray(params.year) ? params.year[0] : params.year;

  const quotes = await loadQuotesForSales();

  if (quotes.length === 0) {
    return (
      <div className="space-y-4">
        <AnalysisTabs active="sales" />
        <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-900/5">
          <p className="text-slate-600">まだ見積もりが登録されていません。</p>
          <p className="mt-1 text-sm text-slate-500">
            データがたまると、ここで月ごとの売上高と売れ筋を確認できます。
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-gradient-to-b from-blue-600 to-blue-700 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-blue-900/20 hover:from-blue-700 hover:to-blue-800"
          >
            <PenLine className="h-4 w-4" aria-hidden />
            登録画面で最初の1件を登録する
          </Link>
        </div>
      </div>
    );
  }

  const years = availableYears(quotes);
  const parsedYear = Number.parseInt(rawYear ?? "", 10);
  const year = years.includes(parsedYear) ? parsedYear : years[0];
  const sales = computeYearlySales(quotes, year);
  const maxTotal = Math.max(...sales.map((m) => m.total));
  const yearTotal = sales.reduce((sum, m) => sum + m.total, 0);
  const yearIndex = years.indexOf(year);
  const olderYear = years[yearIndex + 1]; // 1つ前(古い)年
  const newerYear = years[yearIndex - 1]; // 1つ後(新しい)年

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <AnalysisTabs active="sales" />
        {/* 年の切り替え */}
        <div className="flex items-center gap-1 text-sm">
          {olderYear ? (
            <Link
              href={yearLink(olderYear)}
              className="flex items-center rounded-md p-1.5 text-slate-500 hover:bg-slate-200/70 hover:text-slate-800"
              aria-label={`${olderYear}年を表示`}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Link>
          ) : (
            <span className="p-1.5 text-slate-300">
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </span>
          )}
          <span className="font-bold tabular-nums">{year}年</span>
          {newerYear ? (
            <Link
              href={yearLink(newerYear)}
              className="flex items-center rounded-md p-1.5 text-slate-500 hover:bg-slate-200/70 hover:text-slate-800"
              aria-label={`${newerYear}年を表示`}
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : (
            <span className="p-1.5 text-slate-300">
              <ChevronRight className="h-4 w-4" aria-hidden />
            </span>
          )}
        </div>
      </div>

      {/* 月別の売上高グラフ */}
      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold">月別の売上高</h2>
          <p className="text-sm text-slate-500">
            {year}年の合計{" "}
            <b className="text-base tabular-nums text-slate-800">¥{formatYen(yearTotal)}</b>
          </p>
        </div>
        {maxTotal === 0 ? (
          <p className="mt-6 text-sm text-slate-500">{year}年の売上データはまだありません。</p>
        ) : (
          <div className="mt-4 flex h-48 items-end gap-1 border-b border-slate-200 pb-px sm:gap-2">
            {sales.map((mo) => {
              const heightPercent =
                mo.total === 0 ? 0 : Math.max(4, Math.round((mo.total / maxTotal) * 100));
              return (
                <div
                  key={mo.month}
                  className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
                  title={
                    mo.total > 0
                      ? `${year}年${mo.month}月: ¥${formatYen(mo.total)}`
                      : `${year}年${mo.month}月: 登録なし`
                  }
                >
                  <span className="max-w-full truncate text-[10px] tabular-nums text-slate-500">
                    {mo.total > 0 ? formatYenCompact(mo.total) : " "}
                  </span>
                  <div
                    className="w-full max-w-10 rounded-t bg-gradient-to-t from-blue-700 to-blue-500"
                    style={{ height: `${heightPercent}%` }}
                    role="img"
                    aria-label={`${mo.month}月の売上高 ${
                      mo.total > 0 ? `${formatYen(mo.total)}円` : "なし"
                    }`}
                  />
                </div>
              );
            })}
          </div>
        )}
        {maxTotal > 0 && (
          <div className="mt-1 flex gap-1 sm:gap-2">
            {sales.map((mo) => (
              <span key={mo.month} className="flex-1 text-center text-[10px] text-slate-500">
                {mo.month}月
              </span>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-slate-400">
          金額が未入力の明細は売上高に含まれません。
        </p>
      </section>

      {/* 月ごとの売れ筋ランキング(1年分) */}
      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5 sm:p-6">
        <h2 className="text-lg font-bold">月ごとの売れ筋ランキング</h2>
        <p className="mt-1 text-sm text-slate-600">
          各月の売上高TOP{RANKING_SIZE}です。項目名を押すと、その項目の併売分析に移ります。
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sales.map((mo) => {
            const top = mo.items.slice(0, RANKING_SIZE);
            const monthMax = Math.max(1, ...top.map((i) => i.amount));
            return (
              <div key={mo.month} className="rounded-lg border border-slate-200 p-3">
                <p className="flex items-baseline justify-between">
                  <span className="font-bold">{mo.month}月</span>
                  <span className="text-xs tabular-nums text-slate-500">
                    {mo.total > 0 ? `¥${formatYen(mo.total)}` : "登録なし"}
                  </span>
                </p>
                {top.length === 0 ? (
                  <p className="mt-3 text-center text-xs text-slate-400">-</p>
                ) : (
                  <ol className="mt-2 space-y-1.5">
                    {top.map((item, i) => (
                      <li key={item.itemName} className="text-xs">
                        <p className="flex items-baseline justify-between gap-2">
                          <span className="flex min-w-0 items-baseline gap-1.5">
                            <span
                              className={`w-4 shrink-0 text-center font-bold tabular-nums ${
                                i === 0 ? "text-amber-600" : "text-slate-400"
                              }`}
                            >
                              {i + 1}
                            </span>
                            <Link
                              href={itemLink(item.itemName)}
                              className="truncate text-blue-700 hover:underline"
                              title={`「${item.itemName}」の併売分析を見る`}
                            >
                              {item.itemName}
                            </Link>
                          </span>
                          <span className="shrink-0 tabular-nums text-slate-600">
                            {item.amount > 0 ? `¥${formatYen(item.amount)}` : "金額未入力"}
                          </span>
                        </p>
                        <div className="ml-5.5 mt-0.5 h-1.5 rounded bg-slate-100">
                          <div
                            className="h-full rounded bg-gradient-to-r from-blue-500 to-indigo-600"
                            style={{ width: `${Math.round((item.amount / monthMax) * 100)}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
