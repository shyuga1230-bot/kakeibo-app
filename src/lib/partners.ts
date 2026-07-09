// 協力会社マスタの読み書き(データアクセス層)。
// 認証チェックは呼び出し側(ページ・サーバー処理)で行う。
import "server-only";
import { getPrisma } from "@/lib/db";

export type Partner = { id: number; name: string };

/** 振分け画面・プルダウン用: 全協力会社(名前順) */
export async function listPartners(): Promise<Partner[]> {
  return await getPrisma().partner.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function createPartner(name: string): Promise<void> {
  await getPrisma().partner.create({ data: { name } });
}

export async function updatePartner(id: number, name: string): Promise<void> {
  await getPrisma().partner.update({ where: { id }, data: { name } });
}

export async function deletePartner(id: number): Promise<void> {
  await getPrisma().partner.delete({ where: { id } });
}

/** 案件に新しい会社名が入力されたとき、マスタにも自動で登録する(重複は無視) */
export async function ensurePartner(name: string): Promise<void> {
  await getPrisma().partner.createMany({ data: [{ name }], skipDuplicates: true });
}

/** すでに案件に入力されている協力会社名をマスタへまとめて取り込む */
export async function importPartnersFromProjects(): Promise<number> {
  const rows = await getPrisma().project.findMany({
    where: { partnerName: { not: null } },
    select: { partnerName: true },
    distinct: ["partnerName"],
  });
  const names = rows
    .map((r) => r.partnerName)
    .filter((n): n is string => n !== null && n.trim() !== "");
  if (names.length === 0) return 0;
  const result = await getPrisma().partner.createMany({
    data: names.map((name) => ({ name })),
    skipDuplicates: true,
  });
  return result.count;
}
