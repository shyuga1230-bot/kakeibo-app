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
  { href: "/analysis", label: "分析", icon: TrendingUp },
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

/** ヘッダーの共通の器(白基調・下線のみのすっきりした見た目) */
function HeaderShell({ children }: { children: React.ReactNode }) {
  return (
    <header className="border-b border-slate-200 bg-white">{children}</header>
  );
}

/** Arkのロゴとアプリ名(ヘッダー用) */
function Brand() {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <ArkLogo size={30} />
      <h1 className="flex min-w-0 items-baseline gap-2 leading-none">
        <span className="text-lg font-extrabold tracking-wide text-blue-700">Ark</span>
        <span className="hidden truncate text-[11px] font-medium tracking-wider text-slate-500 lg:inline">
          見積・案件データベース
        </span>
      </h1>
    </div>
  );
}

export default function Header({ userName }: { userName?: string | null }) {
  const pathname = usePathname();
  // いまの画面に合わせて、サマリーとCSVボタンを切り替える
  const section = SECTIONS.find((s) => pathname.startsWith(s.prefix)) ?? DEFAULT_SECTION;

  if (pathname === "/login") {
    return (
      <HeaderShell>
        <div className="mx-auto flex max-w-5xl items-center px-4 py-3">
          <Brand />
        </div>
      </HeaderShell>
    );
  }

  return (
    <HeaderShell>
      {/* 1行目: ロゴ・画面切り替え・CSV/ログアウト(スマホではナビが下の行に折り返す) */}
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex flex-wrap items-center gap-x-3">
          <div className="py-2">
            <Brand />
          </div>
          <nav
            className="order-last -mb-px flex w-full gap-0.5 sm:order-none sm:ml-3 sm:w-auto sm:self-stretch"
            aria-label="画面の切り替え"
          >
            {NAV.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 px-1.5 py-2.5 text-sm font-medium sm:flex-none sm:px-4 ${
                    active
                      ? "border-blue-600 font-semibold text-blue-700"
                      : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-1 py-2 text-xs">
            <a
              href={section.exportHref}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              title={section.exportTitle}
            >
              <Download className="h-4 w-4" aria-hidden />
              <span className="hidden md:inline">CSVを保存</span>
            </a>
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex items-center gap-1 rounded-md px-2 py-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                title="ログアウトしてログイン画面に戻ります"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                <span className="hidden md:inline">ログアウト</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* 2行目: サマリー(見積 or 案件の集計)と、ログイン中の名前 */}
      <div className="border-t border-slate-100 bg-slate-50/70">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-1.5">
          <section.SummaryBar />
          {userName && (
            <Link
              href="/members"
              className="hidden max-w-32 shrink-0 truncate text-xs text-slate-400 hover:text-slate-700 hover:underline sm:inline"
              title="ログイン中の名前。押すと社員名簿を開きます"
            >
              {userName}さん
            </Link>
          )}
        </div>
      </div>
    </HeaderShell>
  );
}
