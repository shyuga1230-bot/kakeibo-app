"use client";
// ヘッダーに常時表示するサマリー4項目。
// ページ移動・タブの再表示・データ変更(登録/編集/削除)のたびに集計し直す。

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { DATA_CHANGED_EVENT } from "@/lib/events";
import { formatYen } from "@/lib/format";
import type { Summary } from "@/lib/analysis";

type State =
  | { status: "loading"; data?: Summary }
  | { status: "ok"; data: Summary }
  | { status: "error"; data?: Summary };

export default function SummaryBar() {
  const pathname = usePathname();
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/summary", { cache: "no-store" });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data: Summary = await res.json();
      setState({ status: "ok", data });
    } catch {
      setState((prev) => ({ status: "error", data: prev.data }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, pathname]);

  useEffect(() => {
    const onChanged = () => load();
    const onFocus = () => load();
    window.addEventListener(DATA_CHANGED_EVENT, onChanged);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener(DATA_CHANGED_EVENT, onChanged);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  const d = state.data;
  const cell = (label: string, value: string) => (
    <div className="flex flex-col items-center rounded-md bg-white/10 px-2 py-1">
      <span className="text-[11px] leading-tight text-blue-100">{label}</span>
      <span className="tabular-nums text-sm font-bold leading-tight sm:text-base">
        {value}
      </span>
    </div>
  );

  if (state.status === "error" && !d) {
    return (
      <div className="text-xs text-blue-100">
        集計を読み込めませんでした{" "}
        <button onClick={load} className="underline hover:text-white">
          再読み込み
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2">
      {cell("登録件数", d ? `${formatYen(d.quoteCount)}件` : "…")}
      {cell("取扱項目数", d ? `${formatYen(d.itemCount)}種類` : "…")}
      {cell("併売ペア数", d ? `${formatYen(d.pairCount)}組` : "…")}
      {cell("合計金額", d ? `¥${formatYen(d.totalAmount)}` : "…")}
    </div>
  );
}
