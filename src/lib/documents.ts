// 納品書・請求書のデータ層。
// 見積もりから作るときは内容をコピーして保存する(あとから見積もりを変えても
// 書類は変わらない)。編集は書類側で行い、金額はサーバー側で計算し直して保存する。
import "server-only";
import { getPrisma } from "@/lib/db";
import {
  docTotals,
  lineAmount,
  nextDocNumber,
  endOfNextMonth,
  type DocType,
  type DocItemInput,
} from "@/lib/document-calc";
import { toJstDateString } from "@/lib/format";

const notDeleted = { deletedAt: null };

export type DocumentItemData = {
  id: number;
  name: string;
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
  amount: number;
};

export type DocumentWithItems = {
  id: number;
  type: DocType;
  docNumber: string;
  issueDate: string;
  dueDate: string | null;
  customerName: string;
  honorific: string;
  subject: string | null;
  note: string | null;
  taxRate: number;
  quoteId: number | null;
  createdBy: string | null;
  items: DocumentItemData[];
};

export type DocumentInput = {
  docNumber: string;
  issueDate: string;
  dueDate: string | null;
  customerName: string;
  honorific: string;
  subject: string | null;
  note: string | null;
  taxRate: number;
  items: DocItemInput[];
};

type DbDocument = {
  id: number;
  type: string;
  docNumber: string;
  issueDate: string;
  dueDate: string | null;
  customerName: string;
  honorific: string;
  subject: string | null;
  note: string | null;
  taxRate: number;
  quoteId: number | null;
  createdBy: string | null;
  items: DocumentItemData[];
};

function toDocument(d: DbDocument): DocumentWithItems {
  return { ...d, type: d.type as DocType };
}

const itemsSelect = {
  select: {
    id: true,
    name: true,
    quantity: true,
    unit: true,
    unitPrice: true,
    amount: true,
  },
  orderBy: { position: "asc" },
} as const;

/** 書類1枚(明細つき)。ごみ箱の中のものは開けない */
export async function getDocument(id: number): Promise<DocumentWithItems | null> {
  const d = await getPrisma().document.findFirst({
    where: { id, ...notDeleted },
    include: { items: itemsSelect },
  });
  return d ? toDocument(d) : null;
}

/**
 * 書類を新しく作る。
 * - quoteId を渡すと見積もりの内容(日付・顧客名・工事名・明細)をコピーする
 * - copyFromId を渡すと既存の書類の内容をコピーする(納品書→請求書のセット作成用)
 * - 書類番号は同じ種類・同じ年の連番で自動採番する
 */
export async function createDocument(
  type: DocType,
  source: { quoteId?: number; copyFromId?: number },
  createdBy: string | null = null,
): Promise<{ id: number } | { error: string }> {
  const prisma = getPrisma();
  const issueDate = toJstDateString(new Date());

  // コピー元の内容を読む
  let base: Omit<DocumentInput, "docNumber" | "issueDate" | "dueDate"> & {
    quoteId: number | null;
  } = {
    customerName: "",
    honorific: "御中",
    subject: null,
    note: null,
    taxRate: 10,
    items: [],
    quoteId: null,
  };
  if (source.quoteId != null) {
    const quote = await prisma.quote.findFirst({
      where: { id: source.quoteId, ...notDeleted },
      include: { items: { orderBy: { id: "asc" } } },
    });
    if (!quote) return { error: "元の見積もりが見つかりませんでした。" };
    base = {
      customerName: quote.customerName ?? "",
      honorific: "御中",
      subject: quote.memo,
      note: null,
      taxRate: 10,
      quoteId: quote.id,
      items: quote.items.map((i) => ({
        name: i.itemName,
        quantity: 1,
        unit: "式",
        unitPrice: i.amount,
        amount: i.amount ?? 0,
      })),
    };
  } else if (source.copyFromId != null) {
    const from = await getDocument(source.copyFromId);
    if (!from) return { error: "コピー元の書類が見つかりませんでした。" };
    base = {
      customerName: from.customerName,
      honorific: from.honorific,
      subject: from.subject,
      note: from.note,
      taxRate: from.taxRate,
      quoteId: from.quoteId,
      items: from.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        unitPrice: i.unitPrice,
        amount: i.amount,
      })),
    };
  }

  const dueDate = type === "invoice" ? endOfNextMonth(issueDate) : null;
  const year = Number(issueDate.slice(0, 4));

  // 採番→作成。同時に作られて番号がぶつかったときは1回だけやり直す
  for (let attempt = 0; attempt < 2; attempt++) {
    const latest = await prisma.document.findFirst({
      where: { type, docNumber: { startsWith: `${year}-` } },
      orderBy: { docNumber: "desc" },
      select: { docNumber: true },
    });
    try {
      const doc = await prisma.document.create({
        data: {
          type,
          docNumber: nextDocNumber(latest?.docNumber ?? null, year),
          issueDate,
          dueDate,
          customerName: base.customerName,
          honorific: base.honorific,
          subject: base.subject,
          note: base.note,
          taxRate: base.taxRate,
          quoteId: base.quoteId,
          createdBy,
          items: {
            create: base.items.map((item, i) => ({
              position: i,
              name: item.name,
              quantity: item.quantity,
              unit: item.unit,
              unitPrice: item.unitPrice,
              amount: lineAmount(item),
            })),
          },
        },
        select: { id: true },
      });
      return { id: doc.id };
    } catch (e) {
      const isUniqueError =
        typeof e === "object" && e != null && (e as { code?: string }).code === "P2002";
      if (!isUniqueError || attempt === 1) throw e;
    }
  }
  return { error: "書類番号の採番に失敗しました。もう一度お試しください。" };
}

/** 書類を保存する(明細は丸ごと入れ替え、金額は計算し直す) */
export async function updateDocument(
  id: number,
  input: DocumentInput,
): Promise<{ ok: true } | { error: string }> {
  const prisma = getPrisma();
  const existing = await prisma.document.findFirst({
    where: { id, ...notDeleted },
    select: { id: true },
  });
  if (!existing) return { error: "この書類は見つかりませんでした(削除された可能性があります)。" };

  try {
    await prisma.$transaction([
      prisma.document.update({
        where: { id },
        data: {
          docNumber: input.docNumber,
          issueDate: input.issueDate,
          dueDate: input.dueDate,
          customerName: input.customerName,
          honorific: input.honorific,
          subject: input.subject,
          note: input.note,
          taxRate: input.taxRate,
        },
      }),
      prisma.documentItem.deleteMany({ where: { documentId: id } }),
      prisma.documentItem.createMany({
        data: input.items.map((item, i) => ({
          documentId: id,
          position: i,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          amount: lineAmount(item),
        })),
      }),
    ]);
    return { ok: true };
  } catch (e) {
    const isUniqueError =
      typeof e === "object" && e != null && (e as { code?: string }).code === "P2002";
    if (isUniqueError) {
      return { error: `書類番号「${input.docNumber}」は同じ種類の別の書類で使われています。` };
    }
    throw e;
  }
}

/** 書類をごみ箱に入れる(30日は戻せる) */
export async function deleteDocument(id: number): Promise<void> {
  await getPrisma().document.updateMany({
    where: { id, ...notDeleted },
    data: { deletedAt: new Date() },
  });
}

export type DocumentListRow = {
  id: number;
  type: DocType;
  docNumber: string;
  issueDate: string;
  customerName: string;
  subject: string | null;
  total: number;
  createdBy: string | null;
  quoteId: number | null;
};

export type DocumentFilter = { type?: DocType; q?: string };

const PAGE_SIZE = 20;

/** 書類の一覧(新しい順・絞り込みとページ送りつき) */
export async function listDocuments(
  page: number,
  filter: DocumentFilter = {},
): Promise<{ documents: DocumentListRow[]; total: number; page: number; pageCount: number }> {
  const where = {
    ...notDeleted,
    ...(filter.type ? { type: filter.type } : {}),
    ...(filter.q
      ? {
          OR: [
            { customerName: { contains: filter.q } },
            { subject: { contains: filter.q } },
            { docNumber: { contains: filter.q } },
          ],
        }
      : {}),
  };
  const prisma = getPrisma();
  const total = await prisma.document.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  const docs = await prisma.document.findMany({
    where,
    orderBy: [{ issueDate: "desc" }, { id: "desc" }],
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: { items: itemsSelect },
  });
  return {
    documents: docs.map((d) => ({
      id: d.id,
      type: d.type as DocType,
      docNumber: d.docNumber,
      issueDate: d.issueDate,
      customerName: d.customerName,
      subject: d.subject,
      total: docTotals(d.items, d.taxRate).total,
      createdBy: d.createdBy,
      quoteId: d.quoteId,
    })),
    total,
    page: currentPage,
    pageCount,
  };
}

export type QuoteDocChip = { id: number; type: DocType; docNumber: string };

/** 見積もりごとの、作成済みの書類(履歴画面のバッジ表示用) */
export async function listDocumentsForQuotes(
  quoteIds: number[],
): Promise<Map<number, QuoteDocChip[]>> {
  if (quoteIds.length === 0) return new Map();
  const docs = await getPrisma().document.findMany({
    where: { quoteId: { in: quoteIds }, ...notDeleted },
    orderBy: { id: "asc" },
    select: { id: true, type: true, docNumber: true, quoteId: true },
  });
  const map = new Map<number, QuoteDocChip[]>();
  for (const d of docs) {
    const list = map.get(d.quoteId!) ?? [];
    list.push({ id: d.id, type: d.type as DocType, docNumber: d.docNumber });
    map.set(d.quoteId!, list);
  }
  return map;
}

export type UninvoicedQuote = {
  id: number;
  quoteDate: string;
  customerName: string | null;
  memo: string | null;
  amount: number;
};

export type DocSummary = {
  monthTotal: number; // 今月の請求額(税込)
  yearTotal: number; // 今年の請求額(税込)
  uninvoiced: UninvoicedQuote[];
  uninvoicedTotal: number;
};

/** 書類ページ上部の集計(請求額と、まだ請求書を作っていない受注) */
export async function getDocSummary(): Promise<DocSummary> {
  const prisma = getPrisma();
  const now = toJstDateString(new Date());
  const year = now.slice(0, 4);
  const month = now.slice(0, 7);

  const [invoices, uninvoicedQuotes] = await Promise.all([
    prisma.document.findMany({
      where: { type: "invoice", ...notDeleted, issueDate: { startsWith: `${year}-` } },
      include: { items: itemsSelect },
    }),
    // 未請求は今年の見積もりだけを見る(この機能を使い始める前の古い見積もりで
    // あふれないようにするため)
    prisma.quote.findMany({
      where: {
        deletedAt: null,
        quoteDate: { startsWith: `${year}-` },
        documents: { none: { type: "invoice", deletedAt: null } },
      },
      orderBy: [{ quoteDate: "desc" }, { id: "desc" }],
      include: { items: { select: { amount: true } } },
    }),
  ]);

  let monthTotal = 0;
  let yearTotal = 0;
  for (const inv of invoices) {
    const { total } = docTotals(inv.items, inv.taxRate);
    yearTotal += total;
    if (inv.issueDate.startsWith(month)) monthTotal += total;
  }

  const uninvoiced = uninvoicedQuotes.map((q) => ({
    id: q.id,
    quoteDate: q.quoteDate,
    customerName: q.customerName,
    memo: q.memo,
    amount: q.items.reduce((sum, i) => sum + (i.amount ?? 0), 0),
  }));

  return {
    monthTotal,
    yearTotal,
    uninvoiced,
    uninvoicedTotal: uninvoiced.reduce((sum, q) => sum + q.amount, 0),
  };
}
