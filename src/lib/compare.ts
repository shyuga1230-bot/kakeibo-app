// 見積もり↔請求書の比較のデータ層。
// 「見積もりから作る」で作られた請求書は quote_id でつながっているので、
// そのペアを読み出して比較用の形に直す。
import "server-only";
import { getPrisma } from "@/lib/db";
import { diffItems, type QuotePair } from "@/lib/compare-calc";

// 一覧に出す上限(古い案件まで全部は出さない)
export const MAX_PAIRS = 200;

/**
 * 請求書が1枚以上ある見積もりを、新しい順に比較用の形で返す。
 * total は上限をかける前の全体の件数(上限を超えたら画面とAIにその旨を知らせる)。
 */
export async function loadQuoteInvoicePairs(): Promise<{
  pairs: QuotePair[];
  total: number;
}> {
  const where = {
    deletedAt: null,
    documents: { some: { type: "invoice", deletedAt: null } },
  };
  const prisma = getPrisma();
  const [total, quotes] = await Promise.all([
    prisma.quote.count({ where }),
    prisma.quote.findMany({
      where,
      orderBy: [{ quoteDate: "desc" }, { id: "desc" }],
      take: MAX_PAIRS,
      include: {
        items: { orderBy: { id: "asc" } },
        documents: {
          where: { type: "invoice", deletedAt: null },
          orderBy: { id: "asc" },
          include: { items: { orderBy: { position: "asc" } } },
        },
      },
    }),
  ]);

  const pairs = quotes.map((q) => {
    // 金額未入力(null)は0にせず、そのまま「比較できない」印として持ち回す
    const quoteItems = q.items.map((i) => ({ name: i.itemName, amount: i.amount }));
    // 分割請求(請求書が複数)のときは合算して見積もりと比べる
    const invoiceItems = q.documents.flatMap((d) =>
      d.items.map((i) => ({ name: i.name, amount: i.amount })),
    );
    return {
      quoteId: q.id,
      quoteDate: q.quoteDate,
      customerName: q.customerName,
      memo: q.memo,
      quoteTotal: quoteItems.reduce((sum, i) => sum + (i.amount ?? 0), 0),
      invoiceTotal: invoiceItems.reduce((sum, i) => sum + i.amount, 0),
      unknownQuoteAmounts: quoteItems.filter((i) => i.amount == null).length,
      invoiceCount: q.documents.length,
      invoiceIds: q.documents.map((d) => d.id),
      diff: diffItems(quoteItems, invoiceItems),
    };
  });
  return { pairs, total };
}
