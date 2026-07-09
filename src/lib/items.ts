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

export type MasterItemWithSales = MasterItem & {
  /** この商品が見積もりに登録された件数(売れている度合いの色分け用) */
  salesCount: number;
};

/** 商品マスタの一覧(登録した順) */
export async function listMasterItems(): Promise<MasterItem[]> {
  return await getPrisma().item.findMany({
    select: { id: true, name: true, defaultAmount: true },
    orderBy: { id: "asc" },
  });
}

/** 商品マスタの一覧に、見積もりへ登録された件数を付けて返す */
export async function listMasterItemsWithSales(): Promise<MasterItemWithSales[]> {
  const [items, stats] = await Promise.all([
    listMasterItems(),
    loadAllQuoteItems().then(computeItemStats),
  ]);
  const countByName = new Map(stats.map((s) => [s.itemName, s.caseCount]));
  return items.map((i) => ({ ...i, salesCount: countByName.get(i.name) ?? 0 }));
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

/** 項目ごとの「直近に登録された金額」を調べる(標準金額の自動設定用) */
async function latestAmountsByName(): Promise<Map<string, number>> {
  const rows = await getPrisma().quoteItem.findMany({
    where: { amount: { not: null } },
    orderBy: { id: "desc" },
    select: { itemName: true, amount: true },
  });
  const latest = new Map<string, number>();
  for (const r of rows) {
    if (!latest.has(r.itemName)) latest.set(r.itemName, r.amount!);
  }
  return latest;
}

/**
 * 過去に見積もりへ登録された項目名のうち、まだマスタに無いものを取り込む。
 * 標準金額には直近に登録された金額を自動で入れる。取り込んだ件数を返す。
 */
export async function importMasterItemsFromHistory(): Promise<number> {
  const stats = computeItemStats(await loadAllQuoteItems());
  const existing = new Set((await listMasterItems()).map((i) => i.name));
  const missing = stats.filter((s) => !existing.has(s.itemName));
  if (missing.length === 0) return 0;
  const latest = await latestAmountsByName();
  const result = await getPrisma().item.createMany({
    data: missing.map((s) => ({
      name: s.itemName,
      defaultAmount: latest.get(s.itemName) ?? null,
    })),
    skipDuplicates: true,
  });
  return result.count;
}

/**
 * 見積もりに登録された項目のうち、マスタに無いものを自動で追加する。
 * そのとき入力された金額を標準金額として覚えるので、
 * 次回からはプルダウンで選ぶだけで金額まで入る。
 * (すでにマスタにある商品の標準金額は変更しない)
 */
export async function ensureMasterItems(
  items: { itemName: string; amount: number | null }[],
): Promise<void> {
  if (items.length === 0) return;
  const byName = new Map<string, number | null>();
  for (const i of items) {
    if (!byName.has(i.itemName)) byName.set(i.itemName, i.amount);
  }
  await getPrisma().item.createMany({
    data: [...byName].map(([name, defaultAmount]) => ({ name, defaultAmount })),
    skipDuplicates: true,
  });
}
