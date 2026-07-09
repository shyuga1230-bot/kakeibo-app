// 月別の売上集計(純粋ロジック)。売上高 = 明細の金額の合計。
// 金額が未入力(null)の明細は件数には数えるが、売上高には含めない。

export type QuoteForSales = {
  /** "YYYY-MM-DD" */
  quoteDate: string;
  items: { itemName: string; amount: number | null }[];
};

export type MonthlyItemSales = {
  itemName: string;
  /** その月の売上高(円) */
  amount: number;
  /** その月に登場した明細の数 */
  count: number;
};

export type MonthlySales = {
  /** 1〜12 */
  month: number;
  /** その月の売上高合計(円) */
  total: number;
  /** 売上高の多い順(同額なら件数の多い順 → 名前順) */
  items: MonthlyItemSales[];
};

/** データが存在する年の一覧(新しい順) */
export function availableYears(quotes: readonly QuoteForSales[]): number[] {
  const years = new Set<number>();
  for (const q of quotes) {
    const m = q.quoteDate.match(/^(\d{4})-/);
    if (m) years.add(Number(m[1]));
  }
  return [...years].sort((a, b) => b - a);
}

export type YearlyItemSales = {
  itemName: string;
  /** その年の売上高(円) */
  amount: number;
  /** その年に登場した明細の数 */
  count: number;
};

/**
 * 指定した年の商品別売上ランキング(売上高の多い順)。
 * 「パッと見でどの商品が売れているか」を出すための年間集計。
 */
export function computeYearlyItemRanking(
  quotes: readonly QuoteForSales[],
  year: number,
): YearlyItemSales[] {
  const map = new Map<string, { amount: number; count: number }>();
  for (const q of quotes) {
    const m = q.quoteDate.match(/^(\d{4})-/);
    if (!m || Number(m[1]) !== year) continue;
    for (const item of q.items) {
      const entry = map.get(item.itemName) ?? { amount: 0, count: 0 };
      entry.count += 1;
      entry.amount += item.amount ?? 0;
      map.set(item.itemName, entry);
    }
  }
  return [...map.entries()]
    .map(([itemName, v]) => ({ itemName, ...v }))
    .sort(
      (a, b) =>
        b.amount - a.amount ||
        b.count - a.count ||
        a.itemName.localeCompare(b.itemName, "ja"),
    );
}

/** 指定した年の売上を月別に集計する(1〜12月ぶんを必ず返す) */
export function computeYearlySales(
  quotes: readonly QuoteForSales[],
  year: number,
): MonthlySales[] {
  const maps = Array.from({ length: 12 }, () => new Map<string, { amount: number; count: number }>());
  const totals = Array(12).fill(0) as number[];

  for (const q of quotes) {
    const m = q.quoteDate.match(/^(\d{4})-(\d{2})/);
    if (!m || Number(m[1]) !== year) continue;
    const idx = Number(m[2]) - 1;
    if (idx < 0 || idx > 11) continue;
    for (const item of q.items) {
      const entry = maps[idx].get(item.itemName) ?? { amount: 0, count: 0 };
      entry.count += 1;
      entry.amount += item.amount ?? 0;
      maps[idx].set(item.itemName, entry);
      totals[idx] += item.amount ?? 0;
    }
  }

  return maps.map((map, idx) => ({
    month: idx + 1,
    total: totals[idx],
    items: [...map.entries()]
      .map(([itemName, v]) => ({ itemName, ...v }))
      .sort(
        (a, b) =>
          b.amount - a.amount ||
          b.count - a.count ||
          a.itemName.localeCompare(b.itemName, "ja"),
      ),
  }));
}
