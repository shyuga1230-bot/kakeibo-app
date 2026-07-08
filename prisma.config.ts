// Prisma(データベース管理ツール)の設定ファイル
// 接続先は .env の DATABASE_URL で切り替える
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
