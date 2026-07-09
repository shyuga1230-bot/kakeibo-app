import type { Metadata } from "next";
import ArkLogo from "@/components/ArkLogo";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = { title: "ログイン | Ark 見積・案件データベース" };

export default function LoginPage() {
  return (
    <>
      {/* 画面全体を包む、深いネイビーのグラデーション背景(右上にブルー、左下にアンバーの光) */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(70rem 40rem at 82% -18%, rgba(59,130,246,0.26), transparent 60%)," +
            "radial-gradient(52rem 30rem at -12% 112%, rgba(245,158,11,0.16), transparent 55%)," +
            "linear-gradient(150deg, #020617 0%, #0b1730 55%, #101f42 100%)",
        }}
      />

      <div className="mx-auto mt-10 max-w-sm">
        <div className="flex flex-col items-center text-center">
          <ArkLogo size={64} />
          <p className="mt-4 bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 bg-clip-text text-3xl font-extrabold tracking-wide text-transparent">
            Ark
          </p>
          <p className="mt-1 text-sm font-medium tracking-[0.2em] text-slate-300">
            見積・案件データベース
          </p>
        </div>

        <div className="mt-8 rounded-2xl bg-white p-6 shadow-2xl shadow-slate-950/40 ring-1 ring-white/10">
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
    </>
  );
}
