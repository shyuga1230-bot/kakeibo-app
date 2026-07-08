import type { Metadata } from "next";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = { title: "ログイン | 見積もり併売データベース" };

export default function LoginPage() {
  return (
    <div className="mx-auto mt-8 max-w-sm">
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold">ログイン</h2>
        <p className="mt-1 text-sm text-slate-600">
          全社共通のパスワードを入力してください。
          パスワードが分からない場合は管理者に確認してください。
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
