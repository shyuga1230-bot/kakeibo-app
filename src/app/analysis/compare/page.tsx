// 見積↔請求の比較(分析 → 見積↔請求タブ)。
// 「見積もりから作る」で作った請求書と元の見積もりを突き合わせて、
// 結果なにが変わったのか(金額の増減・追加/削除された項目)を見せる。
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, FileText, Minus, Plus } from "lucide-react";
import { getSession } from "@/lib/session";
import { loadQuoteInvoicePairs } from "@/lib/compare";
import { changeRatePercent, summarizePairs, type QuotePair } from "@/lib/compare-calc";
import { formatDate, formatYen } from "@/lib/format";
import AnalysisTabs from "@/components/AnalysisTabs";

export const metadata = { title: "見積↔請求の比較 | Ark 見積・案件データベース" };

/** 増減率の表示("+15.2%" / "−8.0%" / 増減なしは "±0%") */
function RateBadge({ quote, invoice }: { quote: number; invoice: number }) {
  const rate = changeRatePercent(quote, invoice);
  if (rate == null) return <span className="text-xs text-slate-400">-</span>;
  if (Math.abs(rate) < 0.05) return <span className="text-xs text-slate-500">±0%</span>;
  const up = rate > 0;
  return (
    <span
      className={`text-xs font-semibold tabular-nums ${up ? "text-emerald-700" : "text-red-700"}`}
    >
      {up ? "+" : "−"}
      {Math.abs(rate).toFixed(1)}%
    </span>
  );
}

/** 1案件分の、項目ごとの変化の表 */
function PairDiff({ pair }: { pair: QuotePair }) {
  const changedCommon = pair.diff.common.filter((c) => c.quoteAmount !== c.invoiceAmount);
  const sameCount = pair.diff.common.length - changedCommon.length;
  return (
    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-sm">
      {changedCommon.length === 0 && pair.diff.added.length === 0 && pair.diff.removed.length === 0 ? (
        <p className="text-slate-500">項目・金額とも見積もりどおりに請求されています。</p>
      ) : (
        <>
          {changedCommon.map((c) => (
            <p key={`c-${c.name}`} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="min-w-0 break-all font-medium">{c.name}</span>
              <span className="tabular-nums text-slate-500">¥{formatYen(c.quoteAmount)}</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" aria-hidden />
              <span className="tabular-nums">¥{formatYen(c.invoiceAmount)}</span>
              <RateBadge quote={c.quoteAmount} invoice={c.invoiceAmount} />
            </p>
          ))}
          {pair.diff.added.map((a) => (
            <p key={`a-${a.name}`} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <Plus className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
              <span className="min-w-0 break-all">
                {a.name}
                {a.isFee && (
                  <span className="ml-1.5 rounded bg-slate-100 px-1 py-0.5 text-[10px] text-slate-500">
                    経費
                  </span>
                )}
              </span>
              <span className="tabular-nums text-emerald-700">+¥{formatYen(a.amount)}</span>
              <span className="text-xs text-slate-400">(請求で追加)</span>
            </p>
          ))}
          {pair.diff.removed.map((r) => (
            <p key={`r-${r.name}`} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <Minus className="h-3.5 w-3.5 text-red-600" aria-hidden />
              <span className="min-w-0 break-all text-slate-500 line-through">{r.name}</span>
              <span className="tabular-nums text-red-700">−¥{formatYen(r.amount)}</span>
              <span className="text-xs text-slate-400">(請求されず)</span>
            </p>
          ))}
        </>
      )}
      {sameCount > 0 && (
        <p className="text-xs text-slate-400">ほか{sameCount}項目は見積もりどおり。</p>
      )}
      <p className="pt-1 text-xs">
        {pair.invoiceIds.map((id, i) => (
          <Link
            key={id}
            href={`/documents/${id}`}
            className="mr-2 inline-flex items-center gap-1 text-blue-700 hover:underline"
          >
            <FileText className="h-3 w-3" aria-hidden />
            請求書{pair.invoiceCount > 1 ? `(${i + 1}枚目)` : ""}を開く
          </Link>
        ))}
      </p>
    </div>
  );
}

export default async function ComparePage() {
  if (!(await getSession())) redirect("/login");

  const pairs = await loadQuoteInvoicePairs();
  const summary = summarizePairs(pairs);

  if (pairs.length === 0) {
    return (
      <div className="space-y-4">
        <AnalysisTabs active="compare" />
        <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-900/5">
          <p className="text-slate-600">比較できる案件がまだありません。</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            「履歴」や「書類」の<b>「＋請求書」ボタンで見積もりから請求書を作る</b>と、
            見積もりと請求書が自動でつながり、ここで「結果なにが変わったか」を比較できるようになります。
          </p>
          <Link
            href="/documents"
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <FileText className="h-4 w-4" aria-hidden />
            書類ページで請求書を作る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnalysisTabs active="compare" />
      <p className="text-sm text-slate-600">
        見積もりと、そこから作った請求書(税抜)を突き合わせています。対象 {summary.count} 件。
      </p>

      {/* 全体のまとめ */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
          <p className="text-xs text-slate-500">見積もり合計 → 請求合計(税抜)</p>
          <p className="mt-1 flex flex-wrap items-baseline gap-2">
            <span className="text-sm tabular-nums text-slate-500">¥{formatYen(summary.quoteSum)}</span>
            <ArrowRight className="h-3.5 w-3.5 self-center text-slate-400" aria-hidden />
            <span className="text-lg font-bold tabular-nums">¥{formatYen(summary.invoiceSum)}</span>
            <RateBadge quote={summary.quoteSum} invoice={summary.invoiceSum} />
          </p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
          <p className="text-xs text-slate-500">案件ごとの増減</p>
          <p className="mt-1 text-sm">
            <span className="font-bold text-emerald-700">{summary.increased}件</span>
            <span className="text-slate-500"> 増額 / </span>
            <span className="font-bold text-red-700">{summary.decreased}件</span>
            <span className="text-slate-500"> 減額 / </span>
            <span className="font-bold">{summary.unchanged}件</span>
            <span className="text-slate-500"> 変わらず</span>
          </p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
          <p className="text-xs text-slate-500">見方</p>
          <p className="mt-1 text-xs text-slate-600">
            緑=請求で増えた・追加された / 赤=減った・請求されなかった項目です。
          </p>
        </div>
      </div>

      {/* 変わりやすい項目ランキング */}
      {(summary.addedRanking.length > 0 || summary.removedRanking.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
            <h3 className="text-sm font-bold">請求であとから追加されやすい項目</h3>
            {summary.addedRanking.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">まだありません。</p>
            ) : (
              <ol className="mt-2 space-y-1.5">
                {summary.addedRanking.map((r, i) => (
                  <li key={r.name} className="flex items-baseline gap-2 text-sm">
                    <span className="w-5 shrink-0 text-right font-bold tabular-nums text-emerald-700">
                      {i + 1}
                    </span>
                    <span className="min-w-0 break-all">{r.name}</span>
                    <span className="ml-auto shrink-0 text-xs tabular-nums text-slate-500">
                      {r.count}回 / ¥{formatYen(r.totalAmount)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
            <p className="mt-2 text-xs text-slate-400">
              最初から見積もりに入れておくと、請求時の手間や漏れが減ります(経費の行は除いています)。
            </p>
          </section>
          <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
            <h3 className="text-sm font-bold">請求までに削られやすい項目</h3>
            {summary.removedRanking.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">まだありません。</p>
            ) : (
              <ol className="mt-2 space-y-1.5">
                {summary.removedRanking.map((r, i) => (
                  <li key={r.name} className="flex items-baseline gap-2 text-sm">
                    <span className="w-5 shrink-0 text-right font-bold tabular-nums text-red-700">
                      {i + 1}
                    </span>
                    <span className="min-w-0 break-all">{r.name}</span>
                    <span className="ml-auto shrink-0 text-xs tabular-nums text-slate-500">
                      {r.count}回 / ¥{formatYen(r.totalAmount)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
            <p className="mt-2 text-xs text-slate-400">
              よく削られる項目は、受注前の説明や見積もりの単価を見直すヒントになります。
            </p>
          </section>
        </div>
      )}

      {/* 顧客別 */}
      {summary.customers.length > 1 && (
        <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
          <h3 className="text-sm font-bold">顧客ごとの増減のクセ</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[28rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="py-1.5 pr-2 font-medium">顧客</th>
                  <th className="py-1.5 pr-2 text-right font-medium">件数</th>
                  <th className="py-1.5 pr-2 text-right font-medium">見積もり計</th>
                  <th className="py-1.5 pr-2 text-right font-medium">請求計</th>
                  <th className="py-1.5 text-right font-medium">増減</th>
                </tr>
              </thead>
              <tbody>
                {summary.customers.map((c) => (
                  <tr key={c.name} className="border-b border-slate-100">
                    <td className="py-1.5 pr-2">{c.name}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{c.count}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">¥{formatYen(c.quoteSum)}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">¥{formatYen(c.invoiceSum)}</td>
                    <td className="py-1.5 text-right">
                      <RateBadge quote={c.quoteSum} invoice={c.invoiceSum} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 案件ごとの明細 */}
      <section className="space-y-2">
        <h3 className="text-sm font-bold">案件ごとの比較(新しい順)</h3>
        {pairs.map((p) => {
          const changed =
            p.quoteTotal !== p.invoiceTotal ||
            p.diff.added.length > 0 ||
            p.diff.removed.length > 0;
          return (
            <details
              key={p.quoteId}
              className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-900/5"
            >
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-medium tabular-nums">{formatDate(p.quoteDate)}</span>
                <span className="min-w-0 text-sm">{p.customerName ?? "(顧客名なし)"}</span>
                {p.memo && (
                  <span className="max-w-52 truncate text-xs text-slate-400">{p.memo}</span>
                )}
                <span className="ml-auto flex shrink-0 items-center gap-2 text-sm">
                  <span className="tabular-nums text-slate-500">¥{formatYen(p.quoteTotal)}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                  <span className="font-bold tabular-nums">¥{formatYen(p.invoiceTotal)}</span>
                  <RateBadge quote={p.quoteTotal} invoice={p.invoiceTotal} />
                  {!changed && <span className="text-xs text-slate-400">変更なし</span>}
                </span>
              </summary>
              <PairDiff pair={p} />
            </details>
          );
        })}
      </section>
    </div>
  );
}
