"use client";
// ヘッダーに常時表示する見積もりのサマリー4項目。
// 表示の仕組みは HeaderSummaryBar(共通部品)にまとめてある。

import { DATA_CHANGED_EVENT } from "@/lib/events";
import { formatYen } from "@/lib/format";
import type { Summary } from "@/lib/analysis";
import HeaderSummaryBar from "@/components/HeaderSummaryBar";

const LABELS = ["登録件数", "取扱項目数", "併売ペア数", "合計金額"];

export default function SummaryBar() {
  return (
    <HeaderSummaryBar<Summary>
      endpoint="/api/summary"
      changeEvent={DATA_CHANGED_EVENT}
      loadingLabels={LABELS}
      cells={(d) => [
        { label: LABELS[0], value: `${formatYen(d.quoteCount)}件` },
        { label: LABELS[1], value: `${formatYen(d.itemCount)}種類` },
        { label: LABELS[2], value: `${formatYen(d.pairCount)}組` },
        { label: LABELS[3], value: `¥${formatYen(d.totalAmount)}` },
      ]}
    />
  );
}
