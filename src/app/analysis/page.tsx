// 併売分析画面。基準項目を選ぶと「一緒に売れやすい項目」が併売率付きで表示される。
import Link from "next/link";
import { redirect } from "next/navigation";
import { Info, PenLine } from "lucide-react";
import { getSession } from "@/lib/session";
import { getAnalysisData } from "@/lib/quotes";
import { formatYen } from "@/lib/format";
import { normalizeItemName } from "@/lib/normalize";
import ItemPicker from "@/components/ItemPicker";

export const metadata = { title: "併売分析 | 見積もり併売データベース" };

// データ件数がこれ未満の間は「割合がぶれやすい」注意書きを出す
const FEW_DATA_THRESHOLD = 30;

function itemLink(name: string) {
  return `/analysis?item=${encodeURIComponent(name)}`;
}

/** 併売率のバー(10%刻みの目盛り付き) */
function RateBar({ rate }: { rate: number }) {
  return (
    <div
      className="relative h-5 w-full overflow-hidden rounded bg-slate-100"
      style={{
        backgroundImage:
          "repeating-linear-gradient(to right, transparent, transparent calc(10% - 1px), #cbd5e1 calc(10% - 1px), #cbd5e1 10%)",
      }}
      role="img"
      aria-label={`併売率 ${Math.round(rate * 100)}%`}
    >
      <div
        className="h-full rounded-l bg-blue-600"
        style={{ width: `${Math.min(100, rate * 100)}%` }}
      />
    </div>
  );
}

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ item?: string | string[] }>;
}) {
  if (!(await getSession())) redirect("/login");

  const params = await searchParams;
  const rawItem = Array.isArray(params.item) ? params.item[0] : params.item;
  const baseItem = rawItem ? normalizeItemName(rawItem) : null;

  const data = await getAnalysisData(baseItem || null);

  if (data.totalQuotes === 0) {
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow-sm">
        <p className="text-slate-600">まだ見積もりが登録されていません。</p>
        <p className="mt-1 text-sm text-slate-500">
          データがたまると、ここで「一緒に売れやすい組み合わせ」を確認できます。
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
        >
          <PenLine className="h-4 w-4" aria-hidden />
          登録画面で最初の1件を登録する
        </Link>
      </div>
    );
  }

  const co = data.coSales;

  return (
    <div className="space-y-6">
      {data.totalQuotes < FEW_DATA_THRESHOLD && (
        <p className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          登録件数がまだ{formatYen(data.totalQuotes)}件と少ないため、割合はぶれやすい状態です。目安として見てください。
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl bg-white p-4 shadow-sm lg:col-span-1">
          <h2 className="text-base font-bold">1. 基準となる項目を選ぶ</h2>
          <p className="mt-1 text-xs text-slate-500">
            「この項目が売れた案件では、他に何が売れているか?」の
            「この項目」を選びます(登場件数の多い順)。
          </p>
          <div className="mt-3">
            <ItemPicker
              items={data.itemStats.map((s) => ({
                itemName: s.itemName,
                caseCount: s.caseCount,
              }))}
              selected={co ? co.base : null}
            />
          </div>
        </section>

        <section className="rounded-xl bg-white p-4 shadow-sm lg:col-span-2">
          <h2 className="text-base font-bold">2. 一緒に売れている項目</h2>
          {!co ? (
            <p className="mt-6 text-center text-sm text-slate-500">
              左のリストから基準となる項目を選んでください。
            </p>
          ) : co.N === 0 ? (
            <p className="mt-6 text-center text-sm text-slate-500">
              「{co.base}」を含む見積もりはまだ登録されていません。
            </p>
          ) : (
            <>
              <p className="mt-1 text-sm text-slate-600">
                基準:<b>{co.base}</b>(登場 {formatYen(co.N)}件)。
                併売率 = 「{co.base}」を含む案件のうち、その項目も含む案件の割合。
              </p>
              {co.rows.length === 0 ? (
                <p className="mt-6 text-center text-sm text-slate-500">
                  「{co.base}」と一緒に登録された項目はまだありません。
                </p>
              ) : (
                <ul className="mt-4 space-y-2.5">
                  {co.rows.map((row) => (
                    <li key={row.itemName} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[12rem_minmax(0,1fr)_9rem]">
                      <Link
                        href={itemLink(row.itemName)}
                        className="min-w-0 break-all text-sm font-medium text-blue-700 hover:underline"
                        title={`「${row.itemName}」を基準にして分析し直す`}
                      >
                        {row.itemName}
                      </Link>
                      <div className="col-span-2 sm:col-span-1">
                        <RateBar rate={row.rate} />
                      </div>
                      <span className="text-right text-sm tabular-nums text-slate-600 sm:order-none">
                        {formatYen(row.n)}/{formatYen(co.N)}件 ・{" "}
                        <b className="text-slate-800">{Math.round(row.rate * 100)}%</b>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="text-base font-bold">定番の組み合わせ TOP10</h2>
          <p className="mt-1 text-xs text-slate-500">
            2回以上一緒に登場したペアを、回数の多い順に表示しています。
          </p>
          {data.pairs.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              2回以上一緒に登場したペアはまだありません。
            </p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-xs text-slate-500">
                <tr>
                  <th className="py-1 pr-2 font-medium">組み合わせ</th>
                  <th className="w-20 py-1 text-right font-medium">回数</th>
                </tr>
              </thead>
              <tbody>
                {data.pairs.map((p) => (
                  <tr key={`${p.itemA}|${p.itemB}`} className="border-t border-slate-100">
                    <td className="py-1.5 pr-2">
                      <Link href={itemLink(p.itemA)} className="text-blue-700 hover:underline">
                        {p.itemA}
                      </Link>
                      <span className="mx-1 text-slate-400">×</span>
                      <Link href={itemLink(p.itemB)} className="text-blue-700 hover:underline">
                        {p.itemB}
                      </Link>
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{formatYen(p.count)}回</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="text-base font-bold">売れ筋ランキング TOP10</h2>
          <p className="mt-1 text-xs text-slate-500">
            登場した案件数の多い順(同数の場合は金額合計の多い順)。
            項目名を押すと、その項目を基準にした併売分析に切り替わります。
          </p>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr>
                <th className="w-10 py-1 font-medium">順位</th>
                <th className="py-1 pr-2 font-medium">項目名</th>
                <th className="w-16 py-1 text-right font-medium">件数</th>
                <th className="w-28 py-1 text-right font-medium">金額合計</th>
              </tr>
            </thead>
            <tbody>
              {data.itemStats.slice(0, 10).map((s, i) => (
                <tr key={s.itemName} className="border-t border-slate-100">
                  <td className="py-1.5 tabular-nums text-slate-500">{i + 1}</td>
                  <td className="min-w-0 break-all py-1.5 pr-2">
                    <Link href={itemLink(s.itemName)} className="text-blue-700 hover:underline">
                      {s.itemName}
                    </Link>
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{formatYen(s.caseCount)}件</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {s.amountSum > 0 ? `¥${formatYen(s.amountSum)}` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
