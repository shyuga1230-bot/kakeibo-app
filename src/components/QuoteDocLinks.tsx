// 履歴カードの中に出す、書類(納品書・請求書)への小さなリンクと作成ボタン。
// すでに作った書類はリンク、まだ無い種類は「＋作る」ボタンになる。
import Link from "next/link";
import { FileText } from "lucide-react";
import { DOC_TYPES, type DocType } from "@/lib/document-calc";
import type { QuoteDocChip } from "@/lib/documents";
import CreateDocumentButton from "@/components/CreateDocumentButton";

const CHIP_CLS = {
  invoice: "bg-blue-100 text-blue-800 hover:bg-blue-200",
  delivery: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
} as const;

export default function QuoteDocLinks({
  quoteId,
  docs,
}: {
  quoteId: number;
  docs: QuoteDocChip[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {docs.map((d) => (
        <Link
          key={d.id}
          href={`/documents/${d.id}`}
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${CHIP_CLS[d.type]}`}
          title={`${DOC_TYPES[d.type].label} No.${d.docNumber} を開きます`}
        >
          <FileText className="h-3 w-3" aria-hidden />
          {DOC_TYPES[d.type].label} {d.docNumber}
        </Link>
      ))}
      {(["delivery", "invoice"] as DocType[])
        .filter((type) => !docs.some((d) => d.type === type))
        .map((type) => (
          <CreateDocumentButton
            key={type}
            type={type}
            quoteId={quoteId}
            label={`＋${DOC_TYPES[type].label}`}
            small
          />
        ))}
    </div>
  );
}
