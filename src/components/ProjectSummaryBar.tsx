"use client";
// 案件管理の画面でヘッダーに常時表示するサマリー4項目。
// 表示の仕組みは HeaderSummaryBar(共通部品)にまとめてある。

import { PROJECT_DATA_CHANGED_EVENT } from "@/lib/events";
import { formatYen } from "@/lib/format";
import HeaderSummaryBar from "@/components/HeaderSummaryBar";

type ProjectSummary = {
  total: number;
  notStarted: number;
  inProgress: number;
  done: number;
};

const LABELS = ["案件数", "未着手", "進行中", "完了"];

export default function ProjectSummaryBar() {
  return (
    <HeaderSummaryBar<ProjectSummary>
      endpoint="/api/projects/summary"
      changeEvent={PROJECT_DATA_CHANGED_EVENT}
      loadingLabels={LABELS}
      cells={(d) => [
        { label: LABELS[0], value: `${formatYen(d.total)}件` },
        { label: LABELS[1], value: `${formatYen(d.notStarted)}件` },
        { label: LABELS[2], value: `${formatYen(d.inProgress)}件` },
        { label: LABELS[3], value: `${formatYen(d.done)}件` },
      ]}
    />
  );
}
