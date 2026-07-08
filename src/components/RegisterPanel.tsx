"use client";
// 登録画面の本体。見積書の貼り付け(自動入力)と登録フォームをつなぐ。
// 読み取り結果のメッセージはフォームの直前に表示する
// (自動スクロール後も注意書きが必ず目に入るようにするため)。

import { useRef, useState } from "react";
import QuoteForm, { type QuoteFormPrefill } from "@/components/QuoteForm";
import SheetPaste from "@/components/SheetPaste";
import type { ParsedQuoteSheet } from "@/lib/quote-sheet";

type Props = {
  suggestions: string[];
};

type ParseInfo = {
  itemCount: number;
  warnings: string[];
};

export default function RegisterPanel({ suggestions }: Props) {
  const [prefill, setPrefill] = useState<QuoteFormPrefill | null>(null);
  const [parseInfo, setParseInfo] = useState<ParseInfo | null>(null);
  const [formKey, setFormKey] = useState(0);
  const formRef = useRef<HTMLDivElement>(null);

  const handleParsed = (data: ParsedQuoteSheet) => {
    setPrefill({
      quoteDate: data.quoteDate ?? "",
      customerName: data.customerName ?? "",
      memo: data.memo ?? "",
      items: data.items.map((i) => ({
        name: i.itemName,
        amount: i.amount == null ? "" : String(i.amount),
      })),
    });
    setParseInfo({ itemCount: data.items.length, warnings: data.warnings });
    // フォームを読み取り結果で作り直す(key を変えるとフォームがリセットされる)
    setFormKey((k) => k + 1);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  return (
    <div className="space-y-4">
      <SheetPaste onParsed={handleParsed} />
      <div ref={formRef} className="scroll-mt-2 space-y-2">
        {parseInfo && (
          <div className="space-y-1">
            <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
              ✓ 見積書を読み取り、下のフォームに入れました({parseInfo.itemCount}
              項目)。内容を確認して「この内容で登録する」を押してください。
            </p>
            {parseInfo.warnings.map((w) => (
              <p key={w} className="rounded-md bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
                ⚠ {w}
              </p>
            ))}
          </div>
        )}
        <QuoteForm
          key={formKey}
          suggestions={suggestions}
          prefill={prefill ?? undefined}
        />
      </div>
    </div>
  );
}
