import type { Metadata } from "next";
import ArkLogo from "@/components/ArkLogo";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = { title: "ログイン | Ark 見積・案件データベース" };

export default function LoginPage() {
  return (
    <div className="mx-auto mt-10 max-w-sm">
      <div className="flex flex-col items-center text-center">
        <ArkLogo size={56} />
        <p className="mt-3 bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-2xl font-extrabold tracking-wide text-transparent">
          Ark
        </p>
        <p className="mt-0.5 text-sm font-medium tracking-wider text-slate-500">
          見積・案件データベース
        </p>
      </div>

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-lg shadow-slate-900/5 ring-1 ring-slate-900/5">
        <h2 className="text-lg font-bold">ログイン</h2>
        <p className="mt-1 text-sm text-slate-600">
          全社共通のパスワードを入力してください。
          パスワードが分からない場合は管理者に確認してください。
        </p>
        <LoginForm />
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        Ark 社内業務ツール — 見積もりの併売分析と案件の進捗管理
      </p>
    </div>
  );
}
