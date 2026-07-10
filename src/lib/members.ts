// 社員名簿の読み書き(データアクセス層)。
// 認証チェックは呼び出し側(ページ・サーバー処理)で行う。
import "server-only";
import { getPrisma } from "@/lib/db";

export type Member = { id: number; name: string };

/** ログイン画面のプルダウン・名簿ページ用: 全社員(名前順) */
export async function listMembers(): Promise<Member[]> {
  return await getPrisma().member.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

/**
 * ログイン画面用: 名簿を読む。データベース未設定などで読めないときは
 * 空にして、画面側は自由入力にフォールバックする。
 */
export async function listMembersSafe(): Promise<Member[]> {
  try {
    return await listMembers();
  } catch (e) {
    console.error("listMembersSafe failed:", e);
    return [];
  }
}

export async function createMember(name: string): Promise<void> {
  await getPrisma().member.create({ data: { name } });
}

export async function updateMember(id: number, name: string): Promise<void> {
  await getPrisma().member.update({ where: { id }, data: { name } });
}

export async function deleteMember(id: number): Promise<void> {
  await getPrisma().member.delete({ where: { id } });
}
