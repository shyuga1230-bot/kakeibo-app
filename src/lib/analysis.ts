// 併売分析(バスケット分析)の計算処理。
// データベースには依存せず、「見積もりごとの項目名リスト」を受け取って計算する。
// 1案件内に同じ項目が複数あっても1回と数える(呼び出し側で重複がない前提だが、
// 念のためここでも Set で重複を除く)。

export type QuoteItems = {
  quoteId: number;
  itemNames: string[];
  amounts?: (number | null)[];
};

export type ItemStat = {
  itemName: string;
  caseCount: number; // 登場した案件数
  amountSum: number; // 金額合計(入力された分のみ)
};

export type CoSaleRow = {
  itemName: string;
  n: number; // 基準項目と両方含む案件数
  rate: number; // 併売率 = n / N
};

export type PairStat = {
  itemA: string;
  itemB: string;
  count: number; // 一緒に登場した案件数
};

/** 案件ごとの項目リストから、項目別の統計(登場案件数・金額合計)を出す */
export function computeItemStats(quotes: QuoteItems[]): ItemStat[] {
  const stats = new Map<string, ItemStat>();
  for (const q of quotes) {
    const seen = new Set<string>();
    q.itemNames.forEach((name, idx) => {
      let s = stats.get(name);
      if (!s) {
        s = { itemName: name, caseCount: 0, amountSum: 0 };
        stats.set(name, s);
      }
      if (!seen.has(name)) {
        s.caseCount += 1;
        seen.add(name);
      }
      const amount = q.amounts?.[idx];
      if (amount != null) s.amountSum += amount;
    });
  }
  return [...stats.values()].sort(
    (a, b) =>
      b.caseCount - a.caseCount ||
      b.amountSum - a.amountSum ||
      a.itemName.localeCompare(b.itemName, "ja"),
  );
}

/**
 * 基準項目 base に対する併売率を計算する。
 * N = base を含む案件数、n = base と相手の両方を含む案件数、併売率 = n / N。
 * 件数 n の降順(同数なら率の降順、さらに同じなら名前順)で返す。
 */
export function computeCoSales(
  quotes: QuoteItems[],
  base: string,
): { N: number; rows: CoSaleRow[] } {
  const baseQuotes = quotes.filter((q) => new Set(q.itemNames).has(base));
  const N = baseQuotes.length;
  if (N === 0) return { N: 0, rows: [] };

  const counts = new Map<string, number>();
  for (const q of baseQuotes) {
    for (const name of new Set(q.itemNames)) {
      if (name === base) continue;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  const rows = [...counts.entries()]
    .map(([itemName, n]) => ({ itemName, n, rate: n / N }))
    .sort(
      (a, b) =>
        b.n - a.n || b.rate - a.rate || a.itemName.localeCompare(b.itemName, "ja"),
    );
  return { N, rows };
}

/**
 * 一緒に登場したペアの統計。count(一緒に登場した案件数)の降順。
 * minCount 以上のペアだけ返す(既定 2)。
 */
export function computePairs(quotes: QuoteItems[], minCount = 2): PairStat[] {
  const counts = new Map<string, number>();
  for (const q of quotes) {
    const names = [...new Set(q.itemNames)].sort((a, b) =>
      a.localeCompare(b, "ja"),
    );
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const key = `${names[i]}\u0000${names[j]}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= minCount)
    .map(([key, count]) => {
      const [itemA, itemB] = key.split("\u0000");
      return { itemA, itemB, count };
    })
    .sort(
      (a, b) =>
        b.count - a.count ||
        a.itemA.localeCompare(b.itemA, "ja") ||
        a.itemB.localeCompare(b.itemB, "ja"),
    );
}

export type Summary = {
  quoteCount: number; // 登録件数
  itemCount: number; // 取扱項目数(項目名の種類数)
  pairCount: number; // 併売ペア数(2回以上一緒に登場したペアの数)
  totalAmount: number; // 合計金額(金額が入力された明細のみ)
};

/** ヘッダーに常時表示するサマリー4項目を計算する */
export function computeSummary(quotes: QuoteItems[]): Summary {
  const itemNames = new Set<string>();
  let totalAmount = 0;
  for (const q of quotes) {
    for (const name of q.itemNames) itemNames.add(name);
    for (const a of q.amounts ?? []) if (a != null) totalAmount += a;
  }
  return {
    quoteCount: quotes.length,
    itemCount: itemNames.size,
    pairCount: computePairs(quotes, 2).length,
    totalAmount,
  };
}
