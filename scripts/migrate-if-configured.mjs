// DATABASE_URL が設定されているときだけ、データベースのマイグレーション
// (表の作成・更新)を実行する。
// データベースをまだ接続していない環境(例: Vercel の初回デプロイ直後)でも
// ビルド自体は成功させ、画面側で設定案内を表示できるようにするため。
import "dotenv/config";
import { spawnSync } from "node:child_process";

// データベースの接続先が(どの変数名であれ)設定されているか確認する。
// Vercel の Neon 連携は DATABASE_URL / POSTGRES_URL などを自動で入れる。
const dbUrl =
  process.env.DIRECT_DATABASE_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL;

if (!dbUrl) {
  console.warn(
    "[build] データベースの接続先(DATABASE_URL など)が未設定のため、マイグレーションを省略しました。",
  );
  console.warn(
    "[build] 本番で使う前に環境変数を設定してください(README「本番運用」参照)。",
  );
  process.exit(0);
}

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(result.status ?? 1);
