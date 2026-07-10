import type { Metadata } from "next";
import ArkLogo from "@/components/ArkLogo";
import LoginForm from "@/components/LoginForm";
import { listMembersSafe } from "@/lib/members";

export const metadata: Metadata = { title: "ログイン | Ark 見積・案件データベース" };

export default async function LoginPage() {
  // 社員名簿(登録があれば名前をプルダウンで選べる。読めなければ自由入力)
  const members = await listMembersSafe();
  return (
    <div className="mx-auto mt-12 max-w-sm">
      <div className="flex flex-col items-center text-center">
        <ArkLogo size={56} />
        <p className="mt-3 text-2xl font-extrabold tracking-wide text-blue-700">Ark</p>
        <p className="mt-0.5 text-sm font-medium tracking-wider text-slate-500">
          見積・案件データベース
        </p>
      </div>

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-bold">ログイン</h2>
        <p className="mt-1 text-sm text-slate-600">
          全社共通のパスワードを入力してください。
          パスワードが分からない場合は管理者に確認してください。
        </p>
        <LoginForm memberNames={members.map((m) => m.name)} />
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        Ark 社内業務ツール — 見積もりの併売分析と案件の進捗管理
      </p>
    </div>
  );
}
