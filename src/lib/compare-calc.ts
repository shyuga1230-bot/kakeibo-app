// 見積もり↔請求書の比較の計算。
// 「見積もりのどの項目が、請求までにどう変わったか」を項目名の突き合わせで求める。
// 画面とテストの両方から使うため、外部に依存しない純粋な関数だけを置く。

import { normalizeItemName } from "@/lib/normalize";
import { isFeeItem } from "@/lib/quote-sheet";

export type CompareItem = { name: string; amount: number };

export type ItemDiff = {
  /** 見積もりにも請求書にもある項目(金額の変化を見る) */
  common: { name: string; quoteAmount: number; invoiceAmount: number }[];
  /** 請求書で追加された項目。経費(諸経費など)は見積もりに元々入らないため印を付ける */
  added: { name: string; amount: number; isFee: boolean }[];
  /** 見積もりにあったのに請求書に無い項目 */
  removed: { name: string; amount: number }[];
};

/** 項目名で突き合わせて、共通・追加・削除に分ける(表記ゆれは正規化して吸収) */
export function diffItems(
  quoteItems: readonly CompareItem[],
  invoiceItems: readonly CompareItem[],
): ItemDiff {
  const invoiceByName = new Map<string, CompareItem>();
  for (const item of invoiceItems) {
    const key = normalizeItemName(item.name);
    const existing = invoiceByName.get(key);
    // 同じ名前が複数行あれば合算して1つとして扱う
    invoiceByName.set(
      key,
      existing ? { name: item.name, amount: existing.amount + item.amount } : item,
    );
  }

  const common: ItemDiff["common"] = [];
  const removed: ItemDiff["removed"] = [];
  const matched = new Set<string>();
  for (const q of quoteItems) {
    const key = normalizeItemName(q.name);
    const inv = invoiceByName.get(key);
    if (inv) {
      matched.add(key);
      common.push({ name: q.name, quoteAmount: q.amount, invoiceAmount: inv.amount });
    } else {
      removed.push({ name: q.name, amount: q.amount });
    }
  }

  const added: ItemDiff["added"] = [];
  for (const [key, item] of invoiceByName) {
    if (!matched.has(key)) {
      added.push({ name: item.name, amount: item.amount, isFee: isFeeItem(normalizeItemName(item.name)) });
    }
  }

  return { common, added, removed };
}

export type QuotePair = {
  quoteId: number;
  quoteDate: string;
  customerName: string | null;
  memo: string | null;
  quoteTotal: number;
  /** 見積もりに紐づく請求書(複数あれば合算)の税抜合計 */
  invoiceTotal: number;
  invoiceCount: number;
  invoiceIds: number[];
  diff: ItemDiff;
};

export type ItemChangeRank = { name: string; count: number; totalAmount: number };

export type CompareSummary = {
  count: number;
  quoteSum: number;
  invoiceSum: number;
  /** 請求書で追加されやすい項目(経費は除く) */
  addedRanking: ItemChangeRank[];
  /** 請求までに削られやすい項目 */
  removedRanking: ItemChangeRank[];
  /** 金額が増えた/減った案件の数 */
  increased: number;
  decreased: number;
  unchanged: number;
  customers: { name: string; count: number; quoteSum: number; invoiceSum: number }[];
};

/** 増減率(%)。見積もりが0円のときは null(比率を出せない) */
export function changeRatePercent(quoteTotal: number, invoiceTotal: number): number | null {
  if (quoteTotal <= 0) return null;
  return ((invoiceTotal - quoteTotal) / quoteTotal) * 100;
}

function rankChanges(
  entries: { name: string; amount: number }[],
  topN: number,
): ItemChangeRank[] {
  const byName = new Map<string, ItemChangeRank>();
  for (const e of entries) {
    const key = normalizeItemName(e.name);
    const cur = byName.get(key) ?? { name: e.name, count: 0, totalAmount: 0 };
    cur.count += 1;
    cur.totalAmount += e.amount;
    byName.set(key, cur);
  }
  return [...byName.values()]
    .sort((a, b) => b.count - a.count || b.totalAmount - a.totalAmount)
    .slice(0, topN);
}

/** 全案件をまとめた傾向(ランキング・顧客別) */
export function summarizePairs(pairs: readonly QuotePair[], topN = 5): CompareSummary {
  let quoteSum = 0;
  let invoiceSum = 0;
  let increased = 0;
  let decreased = 0;
  let unchanged = 0;
  const added: { name: string; amount: number }[] = [];
  const removed: { name: string; amount: number }[] = [];
  const customers = new Map<string, { name: string; count: number; quoteSum: number; invoiceSum: number }>();

  for (const p of pairs) {
    quoteSum += p.quoteTotal;
    invoiceSum += p.invoiceTotal;
    if (p.invoiceTotal > p.quoteTotal) increased++;
    else if (p.invoiceTotal < p.quoteTotal) decreased++;
    else unchanged++;
    // 経費(諸経費など)は見積もりに元々入らない決まりなので、傾向ランキングからは外す
    added.push(...p.diff.added.filter((a) => !a.isFee));
    removed.push(...p.diff.removed);

    const name = p.customerName ?? "(顧客名なし)";
    const c = customers.get(name) ?? { name, count: 0, quoteSum: 0, invoiceSum: 0 };
    c.count += 1;
    c.quoteSum += p.quoteTotal;
    c.invoiceSum += p.invoiceTotal;
    customers.set(name, c);
  }

  return {
    count: pairs.length,
    quoteSum,
    invoiceSum,
    addedRanking: rankChanges(added, topN),
    removedRanking: rankChanges(removed, topN),
    increased,
    decreased,
    unchanged,
    customers: [...customers.values()].sort((a, b) => b.invoiceSum - a.invoiceSum),
  };
}
