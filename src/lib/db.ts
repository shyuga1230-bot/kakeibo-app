// データベース接続(Prisma クライアント)。
// 実際にデータベースを使う瞬間に初めて接続する(遅延初期化)。
// こうすることで、DATABASE_URL 未設定の環境でもビルドは成功し、
// 画面を開いたときに日本語の設定案内エラーを出せる。
// 開発中のホットリロードで接続が増え続けないよう、グローバルに1つだけ保持する。
import "server-only";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "環境変数 DATABASE_URL が設定されていません。.env ファイル(またはVercelの環境変数)を確認してください(README「初期設定」「本番運用」参照)。",
    );
  }
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createClient();
  }
  return globalForPrisma.prisma;
}
