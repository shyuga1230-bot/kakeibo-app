// データベース接続(Prisma クライアント)。
// 開発中のホットリロードで接続が増え続けないよう、グローバルに1つだけ保持する。
import "server-only";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "環境変数 DATABASE_URL が設定されていません。.env ファイルを確認してください(README「初期設定」参照)。",
    );
  }
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
