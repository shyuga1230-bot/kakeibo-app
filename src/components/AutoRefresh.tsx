"use client";
// 一定間隔とタブ復帰時にページを読み込み直す(何も表示しない部品)。
// 他の人の更新が自動で反映される「リアルタイム」の仕組み。

import { useRouter } from "next/navigation";
import { useAutoReload } from "@/lib/hooks";

const AUTO_REFRESH_MS = 30_000;

export default function AutoRefresh() {
  const router = useRouter();
  useAutoReload(() => router.refresh(), { intervalMs: AUTO_REFRESH_MS });
  return null;
}
