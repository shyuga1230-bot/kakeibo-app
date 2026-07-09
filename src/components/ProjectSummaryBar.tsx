"use client";
// 案件管理の画面でヘッダーに常時表示するサマリー4項目。
// ページ移動・タブの再表示・データ変更(登録/編集/削除)のたびに集計し直す。

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { PROJECT_DATA_CHANGED_EVENT } from "@/lib/events";
import { formatYen } from "@/lib/format";

type ProjectSummary = {
  total: number;
  notStarted: number;
  inProgress: number;
  done: number;
};

type State =
  | { status: "loading"; data?: ProjectSummary }
  | { status: "ok"; data: ProjectSummary }
  | { status: "error"; data?: ProjectSummary };

export default function ProjectSummaryBar() {
  const pathname = usePathname();
  const [state, setState] = useState<State>({ status: "loading" });

  // 後から始めた読み込みを優先し、遅れて届いた古い応答は捨てる
  const loadSeq = useRef(0);
  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    try {
      const res = await fetch("/api/projects/summary", { cache: "no-store" });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data: ProjectSummary = await res.json();
      if (seq !== loadSeq.current) return;
      setState({ status: "ok", data });
    } catch {
      if (seq !== loadSeq.current) return;
      setState((prev) => ({ status: "error", data: prev.data }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, pathname]);

  useEffect(() => {
    const onChanged = () => load();
    const onFocus = () => load();
    window.addEventListener(PROJECT_DATA_CHANGED_EVENT, onChanged);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener(PROJECT_DATA_CHANGED_EVENT, onChanged);
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
      {cell("案件数", d ? `${formatYen(d.total)}件` : "…")}
      {cell("未着手", d ? `${formatYen(d.notStarted)}件` : "…")}
      {cell("進行中", d ? `${formatYen(d.inProgress)}件` : "…")}
      {cell("完了", d ? `${formatYen(d.done)}件` : "…")}
    </div>
  );
}
