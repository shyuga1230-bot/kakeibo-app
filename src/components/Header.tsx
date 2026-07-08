"use client";
// 全画面共通のヘッダー。タイトル・サマリー4項目・画面切り替え・CSV・ログアウト。

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  Download,
  History,
  LogOut,
  PenLine,
  TrendingUp,
} from "lucide-react";
import SummaryBar from "@/components/SummaryBar";
import { logoutAction } from "@/app/actions";

const NAV = [
  { href: "/", label: "登録", icon: PenLine },
  { href: "/analysis", label: "併売分析", icon: TrendingUp },
  { href: "/history", label: "履歴", icon: History },
];

export default function Header() {
  const pathname = usePathname();

  if (pathname === "/login") {
    return (
      <header className="bg-blue-800 text-white">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
          <ClipboardList className="h-5 w-5" aria-hidden />
          <h1 className="text-base font-bold sm:text-lg">見積もり併売データベース</h1>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-blue-800 text-white shadow-md">
      <div className="mx-auto max-w-5xl px-4 pb-2 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 shrink-0" aria-hidden />
            <h1 className="text-base font-bold sm:text-lg">
              見積もり併売データベース
            </h1>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <a
              href="/api/export"
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-blue-100 hover:bg-white/10 hover:text-white"
              title="全データをExcelで開けるCSVファイルとして保存します"
            >
              <Download className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">CSVを保存</span>
            </a>
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex items-center gap-1 rounded-md px-2 py-1.5 text-blue-100 hover:bg-white/10 hover:text-white"
                title="ログアウトしてログイン画面に戻ります"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">ログアウト</span>
              </button>
            </form>
          </div>
        </div>

        <div className="mt-2">
          <SummaryBar />
        </div>

        <nav className="mt-2 flex gap-1" aria-label="画面の切り替え">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-t-lg px-3 py-2 text-sm font-medium sm:flex-none sm:px-5 ${
                  active
                    ? "bg-slate-100 text-blue-800"
                    : "text-blue-100 hover:bg-white/10 hover:text-white"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
