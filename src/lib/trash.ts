// ごみ箱(削除した見積もり・案件の一時置き場)のデータ層。
// 削除 = deleted_at に日時を入れるだけ。30日を過ぎたものは開くたびに完全削除する。
import "server-only";
import { getPrisma } from "@/lib/db";

export const TRASH_DAYS = 30;

export type TrashedQuote = {
  id: number;
  quoteDate: string;
  customerName: string | null;
  itemNames: string[];
  deletedAt: Date;
};

export type TrashedProject = {
  id: number;
  projectName: string;
  clientName: string | null;
  deletedAt: Date;
};

function cutoff(): Date {
  return new Date(Date.now() - TRASH_DAYS * 24 * 60 * 60 * 1000);
}

/** 30日を過ぎたごみ箱の中身を完全に削除する(ごみ箱を開いたときに実行) */
export async function purgeExpiredTrash(): Promise<void> {
  const limit = cutoff();
  await getPrisma().$transaction([
    getPrisma().quote.deleteMany({ where: { deletedAt: { lt: limit } } }),
    getPrisma().project.deleteMany({ where: { deletedAt: { lt: limit } } }),
  ]);
}

/** ごみ箱の中身(新しく削除した順) */
export async function listTrash(): Promise<{
  quotes: TrashedQuote[];
  projects: TrashedProject[];
}> {
  await purgeExpiredTrash();
  const [quotes, projects] = await Promise.all([
    getPrisma().quote.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      select: {
        id: true,
        quoteDate: true,
        customerName: true,
        deletedAt: true,
        items: { select: { itemName: true }, orderBy: { id: "asc" } },
      },
    }),
    getPrisma().project.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      select: {
        id: true,
        projectName: true,
        clientName: true,
        deletedAt: true,
      },
    }),
  ]);
  return {
    quotes: quotes.map((q) => ({
      id: q.id,
      quoteDate: q.quoteDate,
      customerName: q.customerName,
      itemNames: q.items.map((i) => i.itemName),
      deletedAt: q.deletedAt!,
    })),
    projects: projects.map((p) => ({
      id: p.id,
      projectName: p.projectName,
      clientName: p.clientName,
      deletedAt: p.deletedAt!,
    })),
  };
}

/** 見積もりをごみ箱から戻す。戻せたら true(すでに完全削除済みなら false) */
export async function restoreQuote(id: number): Promise<boolean> {
  const result = await getPrisma().quote.updateMany({
    where: { id, deletedAt: { not: null } },
    data: { deletedAt: null },
  });
  return result.count > 0;
}

/** 案件をごみ箱から戻す。戻せたら true(すでに完全削除済みなら false) */
export async function restoreProject(
  id: number,
  changedBy: string | null = null,
): Promise<boolean> {
  const result = await getPrisma().project.updateMany({
    where: { id, deletedAt: { not: null } },
    data: { deletedAt: null },
  });
  if (result.count > 0) {
    await getPrisma().projectLog.create({
      data: { projectId: id, action: "ごみ箱から戻しました", changedBy },
    });
  }
  return result.count > 0;
}
