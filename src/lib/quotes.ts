// 見積もりデータの読み書き(データアクセス層)。
// 認証チェックは呼び出し側(ページ・サーバー処理)で行う。
import "server-only";
import { getPrisma } from "@/lib/db";
import {
  computeCoSales,
  computeItemStats,
  computePairs,
  computeSummary,
  type QuoteItems,
  type Summary,
} from "@/lib/analysis";

export type QuoteInput = {
  quoteDate: string; // "YYYY-MM-DD"
  customerName: string | null;
  memo: string | null;
  items: { itemName: string; amount: number | null }[];
};

export type QuoteWithItems = {
  id: number;
  quoteDate: string;
  customerName: string | null;
  memo: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: { id: number; itemName: string; amount: number | null }[];
};

/** 分析・サマリー用に、全見積もりの項目名と金額を読み込む */
export async function loadAllQuoteItems(): Promise<QuoteItems[]> {
  const quotes = await getPrisma().quote.findMany({
    select: {
      id: true,
      items: { select: { itemName: true, amount: true }, orderBy: { id: "asc" } },
    },
  });
  return quotes.map((q) => ({
    quoteId: q.id,
    itemNames: q.items.map((i) => i.itemName),
    amounts: q.items.map((i) => i.amount),
  }));
}

export async function getSummary(): Promise<Summary> {
  return computeSummary(await loadAllQuoteItems());
}

/** 併売分析ページに必要なデータ一式 */
export async function getAnalysisData(baseItem: string | null) {
  const all = await loadAllQuoteItems();
  const itemStats = computeItemStats(all);
  const pairs = computePairs(all, 2).slice(0, 10);
  const coSales = baseItem ? computeCoSales(all, baseItem) : null;
  return {
    totalQuotes: all.length,
    itemStats,
    pairs,
    coSales: coSales
      ? { base: baseItem!, N: coSales.N, rows: coSales.rows.slice(0, 12) }
      : null,
  };
}

/** 登録画面のサジェスト用: 過去に登録された項目名(登場案件数が多い順) */
export async function getItemNameSuggestions(): Promise<string[]> {
  const all = await loadAllQuoteItems();
  return computeItemStats(all).map((s) => s.itemName);
}

const PAGE_SIZE = 50;

/** 履歴ページ用: 新しい順の一覧(日付の新しい順 → 同日なら登録の新しい順) */
export async function listQuotes(page: number): Promise<{
  quotes: QuoteWithItems[];
  total: number;
  page: number;
  pageCount: number;
}> {
  const total = await getPrisma().quote.count();
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const quotes = await getPrisma().quote.findMany({
    orderBy: [{ quoteDate: "desc" }, { id: "desc" }],
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: { items: { orderBy: { id: "asc" } } },
  });
  return { quotes, total, page: safePage, pageCount };
}

export async function getQuote(id: number): Promise<QuoteWithItems | null> {
  return await getPrisma().quote.findUnique({
    where: { id },
    include: { items: { orderBy: { id: "asc" } } },
  });
}

export async function createQuote(input: QuoteInput): Promise<number> {
  const quote = await getPrisma().quote.create({
    data: {
      quoteDate: input.quoteDate,
      customerName: input.customerName,
      memo: input.memo,
      items: { create: input.items },
    },
    select: { id: true },
  });
  return quote.id;
}

export async function updateQuote(id: number, input: QuoteInput): Promise<void> {
  // 明細は入れ替え(全削除→再作成)。1つのトランザクションで行う。
  await getPrisma().$transaction([
    getPrisma().quoteItem.deleteMany({ where: { quoteId: id } }),
    getPrisma().quote.update({
      where: { id },
      data: {
        quoteDate: input.quoteDate,
        customerName: input.customerName,
        memo: input.memo,
        items: { create: input.items },
      },
    }),
  ]);
}

export async function deleteQuote(id: number): Promise<void> {
  await getPrisma().quote.delete({ where: { id } });
}

/** 売上分析用: 全見積もりの日付と明細(項目名・金額)を読み込む */
export async function loadQuotesForSales(): Promise<
  { quoteDate: string; items: { itemName: string; amount: number | null }[] }[]
> {
  return await getPrisma().quote.findMany({
    select: {
      quoteDate: true,
      items: { select: { itemName: true, amount: true } },
    },
  });
}

/** CSVエクスポート用: 全データ(明細1行 = CSV1行) */
export async function loadAllForExport(): Promise<QuoteWithItems[]> {
  return await getPrisma().quote.findMany({
    orderBy: [{ quoteDate: "asc" }, { id: "asc" }],
    include: { items: { orderBy: { id: "asc" } } },
  });
}
