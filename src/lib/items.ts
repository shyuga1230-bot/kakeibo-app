// 商品マスタの読み書き(データアクセス層)。
// 認証チェックは呼び出し側(ページ・サーバー処理)で行う。
import "server-only";
import { getPrisma } from "@/lib/db";
import { loadAllQuoteItems } from "@/lib/quotes";
import { computeItemStats } from "@/lib/analysis";

export type MasterItem = {
  id: number;
  name: string;
  defaultAmount: number | null;
};

/** 商品マスタの一覧(登録した順) */
export async function listMasterItems(): Promise<MasterItem[]> {
  return await getPrisma().item.findMany({
    select: { id: true, name: true, defaultAmount: true },
    orderBy: { id: "asc" },
  });
}

export async function createMasterItem(
  name: string,
  defaultAmount: number | null,
): Promise<void> {
  await getPrisma().item.create({ data: { name, defaultAmount } });
}

export async function updateMasterItem(
  id: number,
  name: string,
  defaultAmount: number | null,
): Promise<void> {
  await getPrisma().item.update({ where: { id }, data: { name, defaultAmount } });
}

export async function deleteMasterItem(id: number): Promise<void> {
  await getPrisma().item.delete({ where: { id } });
}

/**
 * 過去に見積もりへ登録された項目名のうち、まだマスタに無いものを取り込む。
 * 取り込んだ件数を返す。
 */
export async function importMasterItemsFromHistory(): Promise<number> {
  const stats = computeItemStats(await loadAllQuoteItems());
  const existing = new Set((await listMasterItems()).map((i) => i.name));
  const missing = stats.filter((s) => !existing.has(s.itemName));
  if (missing.length === 0) return 0;
  const result = await getPrisma().item.createMany({
    data: missing.map((s) => ({ name: s.itemName })),
    skipDuplicates: true,
  });
  return result.count;
}
