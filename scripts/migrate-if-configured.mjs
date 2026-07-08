// DATABASE_URL が設定されているときだけ、データベースのマイグレーション
// (表の作成・更新)を実行する。
// データベースをまだ接続していない環境(例: Vercel の初回デプロイ直後)でも
// ビルド自体は成功させ、画面側で設定案内を表示できるようにするため。
import "dotenv/config";
import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.warn(
    "[build] DATABASE_URL が未設定のため、データベースのマイグレーションを省略しました。",
  );
  console.warn(
    "[build] 本番で使う前に環境変数 DATABASE_URL を設定してください(README「本番運用」参照)。",
  );
  process.exit(0);
}

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(result.status ?? 1);
