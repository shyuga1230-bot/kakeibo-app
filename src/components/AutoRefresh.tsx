"use client";
// 一定間隔とタブ復帰時にページを読み込み直す(何も表示しない部品)。
// 他の人の更新が自動で反映される「リアルタイム」の仕組み。

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AutoRefresh({ intervalMs = 30_000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      router.refresh();
    };
    const timer = setInterval(refresh, intervalMs);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [router, intervalMs]);
  return null;
}
