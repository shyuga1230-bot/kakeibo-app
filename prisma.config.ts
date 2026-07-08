// Prisma(データベース管理ツール)の設定ファイル
// 接続先は環境変数で切り替える。
// マイグレーション(表の作成)は「直接接続(プール経由でない)」のURLを優先する。
// Neon などのプール接続経由だとマイグレーションが失敗することがあるため。
// Vercel の Neon 連携が自動で入れる変数名にも対応している。
import "dotenv/config";
import { defineConfig } from "prisma/config";

const migrationUrl =
  process.env.DIRECT_DATABASE_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: migrationUrl,
  },
});
