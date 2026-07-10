"use client";
// 併売分析の「基準となる項目」を選ぶリスト。
// 登場件数の多い順に並び、件数バッジ付き。絞り込み検索もできる。

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { normalizeItemName } from "@/lib/normalize";

type Props = {
  items: { itemName: string; caseCount: number }[];
  selected: string | null;
};

export default function ItemPicker({ items, selected }: Props) {
  const [query, setQuery] = useState("");
  const q = normalizeItemName(query).toLowerCase();
  const filtered = q === "" ? items : items.filter((i) => i.itemName.toLowerCase().includes(q));

  return (
    <div>
      <label className="relative block">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="項目名で絞り込む"
          aria-label="項目名で絞り込む"
          className="w-full rounded-md border border-slate-300 bg-white py-2 pl-8 pr-3 text-sm focus:border-blue-500 focus:outline-none"
        />
      </label>
      <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto pr-1">
        {filtered.length === 0 && (
          <li className="px-2 py-3 text-sm text-slate-500">
            「{query}」に一致する項目はありません。
          </li>
        )}
        {filtered.map((item) => {
          const active = item.itemName === selected;
          return (
            <li key={item.itemName}>
              <Link
                href={`/analysis/cosales?item=${encodeURIComponent(item.itemName)}`}
                className={`flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm ${
                  active
                    ? "bg-blue-600 text-white"
                    : "bg-slate-50 text-slate-700 hover:bg-blue-50"
                }`}
                aria-current={active ? "true" : undefined}
              >
                <span className="min-w-0 break-all">{item.itemName}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs tabular-nums ${
                    active ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {item.caseCount}件
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
