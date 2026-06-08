'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Home, Receipt, Calendar, PieChart, RefreshCw, Calculator, Tag, Settings, X, Menu
} from 'lucide-react';

const mainNavItems = [
  { href: '/', icon: Home, label: 'ホーム' },
  { href: '/expenses', icon: Receipt, label: '支出' },
  { href: '/calendar', icon: Calendar, label: 'カレンダー' },
  { href: '/budget', icon: PieChart, label: '予算' },
];

const moreNavItems = [
  { href: '/fixed', icon: RefreshCw, label: '固定費' },
  { href: '/calculator', icon: Calculator, label: '電卓' },
  { href: '/categories', icon: Tag, label: 'カテゴリ' },
  { href: '/settings', icon: Settings, label: '設定' },
];

const allNavItems = [...mainNavItems, ...moreNavItems];

export function BottomNavigation() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const isMoreActive = moreNavItems.some((item) => isActive(item.href));

  return (
    <>
      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 shadow-lg md:hidden safe-area-pb">
        <div className="flex items-center">
          {mainNavItems.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${
                isActive(href) ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon size={22} strokeWidth={isActive(href) ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          ))}
          <button
            onClick={() => setShowMore(true)}
            className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${
              isMoreActive ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Menu size={22} strokeWidth={1.8} />
            <span className="text-[10px] font-medium">メニュー</span>
          </button>
        </div>
      </nav>

      {/* More menu overlay */}
      {showMore && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowMore(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-gray-900">メニュー</h3>
              <button onClick={() => setShowMore(false)} className="p-1.5 rounded-full hover:bg-gray-100">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {moreNavItems.map(({ href, icon: Icon, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setShowMore(false)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-colors ${
                    isActive(href) ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={24} strokeWidth={1.8} />
                  <span className="text-xs font-medium text-center">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-100 h-screen sticky top-0 py-6 px-3">
        <div className="px-3 mb-6">
          <h1 className="text-lg font-bold text-gray-900">💰 かけいぼ</h1>
          <p className="text-xs text-gray-400 mt-0.5">大学生の家計管理</p>
        </div>
        <nav className="flex flex-col gap-1">
          {allNavItems.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                isActive(href)
                  ? 'bg-indigo-50 text-indigo-600 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon size={18} strokeWidth={isActive(href) ? 2.5 : 1.8} />
              <span className="text-sm">{label}</span>
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
