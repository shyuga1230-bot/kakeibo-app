"use client";
// ヘッダーに常時表示するサマリー4項目の共通部品。
// ページ移動・タブの再表示・データ変更イベントのたびに集計し直す。
// 遅れて届いた古い応答は捨てる(後から始めた読み込みを優先)。

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAutoReload } from "@/lib/hooks";

type Props<T> = {
  /** 集計を取得するAPI(例: /api/summary) */
  endpoint: string;
  /** このイベントが発火したら集計し直す(例: quote-data-changed) */
  changeEvent: string;
  /** 取得したデータを「ラベル・値」4項目に変換する */
  cells: (data: T) => { label: string; value: string }[];
  /** データ未取得のあいだに表示するラベル(値は「…」になる) */
  loadingLabels: string[];
};

export default function HeaderSummaryBar<T>({
  endpoint,
  changeEvent,
  cells,
  loadingLabels,
}: Props<T>) {
  const pathname = usePathname();
  const [data, setData] = useState<T | null>(null);
  const [failed, setFailed] = useState(false);

  const loadSeq = useRef(0);
  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    try {
      const res = await fetch(endpoint, { cache: "no-store" });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const next: T = await res.json();
      if (seq !== loadSeq.current) return;
      setData(next);
      setFailed(false);
    } catch {
      if (seq !== loadSeq.current) return;
      setFailed(true); // 直前のデータは残したまま
    }
  }, [endpoint]);

  useEffect(() => {
    load();
  }, [load, pathname]);
  useAutoReload(load, { eventName: changeEvent });

  if (failed && !data) {
    return (
      <div className="text-xs text-slate-500">
        集計を読み込めませんでした{" "}
        <button onClick={load} className="underline hover:text-slate-800">
          再読み込み
        </button>
      </div>
    );
  }

  const items = data
    ? cells(data)
    : loadingLabels.map((label) => ({ label, value: "…" }));

  return (
    <div className="flex flex-wrap items-baseline gap-x-5 gap-y-0.5 sm:gap-x-8">
      {items.map(({ label, value }) => (
        <div key={label} className="flex items-baseline gap-1.5">
          <span className="text-[11px] text-slate-500">{label}</span>
          <span className="tabular-nums text-sm font-bold text-slate-900">
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}
