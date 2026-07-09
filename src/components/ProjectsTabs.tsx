// 案件管理の中の「一覧表」「振分け」「ダッシュボード」の切り替えタブ。
import Link from "next/link";
import { LayoutDashboard, ListChecks, Scale } from "lucide-react";

const TABS = [
  { key: "board", href: "/projects", label: "一覧表", icon: ListChecks },
  { key: "assign", href: "/projects/assign", label: "振分け", icon: Scale },
  { key: "dashboard", href: "/projects/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
] as const;

export default function ProjectsTabs({ active }: { active: (typeof TABS)[number]["key"] }) {
  return (
    <nav className="flex w-fit gap-1 rounded-lg bg-slate-200/70 p-1" aria-label="案件管理の表示切り替え">
      {TABS.map(({ key, href, label, icon: Icon }) => (
        <Link
          key={key}
          href={href}
          aria-current={active === key ? "page" : undefined}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ${
            active === key
              ? "bg-white font-medium text-blue-800 shadow-sm"
              : "text-slate-600 hover:bg-white/60"
          }`}
        >
          <Icon className="h-4 w-4" aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}
