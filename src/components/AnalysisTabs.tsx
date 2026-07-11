// 分析の中の「売上」「併売」「見積↔請求」「AIに聞く」の切り替えタブ。
import Link from "next/link";
import { BarChart3, GitCompareArrows, Sparkles, TrendingUp } from "lucide-react";

const TABS = [
  { key: "sales", href: "/analysis", label: "売上", icon: BarChart3 },
  { key: "cosales", href: "/analysis/cosales", label: "併売", icon: TrendingUp },
  { key: "compare", href: "/analysis/compare", label: "見積↔請求", icon: GitCompareArrows },
  { key: "ai", href: "/analysis/ai", label: "AIに聞く", icon: Sparkles },
] as const;

export default function AnalysisTabs({ active }: { active: (typeof TABS)[number]["key"] }) {
  return (
    <nav
      className="flex w-fit max-w-full flex-wrap gap-1 rounded-lg bg-slate-200/70 p-1"
      aria-label="分析の表示切り替え"
    >
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
