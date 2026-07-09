"use client";
// 全画面共通のヘッダー。Arkのロゴ・タイトル・サマリー4項目・画面切り替え・CSV・ログアウト。
// 案件管理の画面では、サマリーとCSVボタンも案件管理用のものに切り替わる。

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Download,
  FolderKanban,
  History,
  LogOut,
  Package,
  PenLine,
  TrendingUp,
} from "lucide-react";
import ArkLogo from "@/components/ArkLogo";
import SummaryBar from "@/components/SummaryBar";
import ProjectSummaryBar from "@/components/ProjectSummaryBar";
import { logoutAction } from "@/app/actions";

const NAV = [
  { href: "/", label: "登録", icon: PenLine },
  { href: "/analysis", label: "併売分析", icon: TrendingUp },
  { href: "/history", label: "履歴", icon: History },
  { href: "/items", label: "商品管理", icon: Package },
  { href: "/projects", label: "案件管理", icon: FolderKanban },
];

// 画面の種類ごとの、サマリーとCSVボタンの切り替え設定
const SECTIONS = [
  {
    prefix: "/projects",
    exportHref: "/api/projects/export",
    exportTitle: "案件管理表をExcelで開けるCSVファイルとして保存します",
    SummaryBar: ProjectSummaryBar,
  },
] as const;

const DEFAULT_SECTION = {
  prefix: "",
  exportHref: "/api/export",
  exportTitle: "全データをExcelで開けるCSVファイルとして保存します",
  SummaryBar: SummaryBar,
} as const;

/** Arkのロゴとアプリ名(ヘッダー用) */
function Brand() {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <ArkLogo size={34} />
      <h1 className="min-w-0 leading-tight">
        <span className="block bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-lg font-extrabold tracking-wide text-transparent sm:text-xl">
          Ark
        </span>
        <span className="block truncate text-[11px] font-medium tracking-wider text-slate-300 sm:text-xs">
          見積・案件データベース
        </span>
      </h1>
    </div>
  );
}

export default function Header() {
  const pathname = usePathname();
  // いまの画面に合わせて、サマリーとCSVボタンを切り替える
  const section = SECTIONS.find((s) => pathname.startsWith(s.prefix)) ?? DEFAULT_SECTION;

  if (pathname === "/login") {
    return (
      <header className="border-b border-amber-500/60 bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 text-white">
        <div className="mx-auto flex max-w-5xl items-center px-4 py-3">
          <Brand />
        </div>
      </header>
    );
  }

  return (
    <header className="border-b border-amber-500/60 bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 text-white shadow-lg shadow-slate-900/10">
      <div className="mx-auto max-w-5xl px-4 pb-2 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Brand />
          <div className="flex items-center gap-1 text-xs">
            <a
              href={section.exportHref}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
              title={section.exportTitle}
            >
              <Download className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">CSVを保存</span>
            </a>
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex items-center gap-1 rounded-md px-2 py-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
                title="ログアウトしてログイン画面に戻ります"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">ログアウト</span>
              </button>
            </form>
          </div>
        </div>

        <div className="mt-3">
          <section.SummaryBar />
        </div>

        <nav className="mt-3 flex gap-1" aria-label="画面の切り替え">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-t-lg border-t-2 px-3 py-2 text-sm font-medium sm:flex-none sm:px-5 ${
                  active
                    ? "border-amber-400 bg-slate-100 font-semibold text-slate-900"
                    : "border-transparent text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  className={`h-4 w-4 ${active ? "text-amber-600" : ""}`}
                  aria-hidden
                />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
