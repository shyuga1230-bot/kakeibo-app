"use client";
// 納品書・請求書を1クリックで作るボタン。
// quoteId を渡すと見積もりの内容をコピーして作り、作成後は編集画面に移動する。

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2 } from "lucide-react";
import type { DocType } from "@/lib/document-calc";

type Props = {
  type: DocType;
  quoteId?: number;
  label: string;
  /** 履歴カードの中などで使う小さい見た目 */
  small?: boolean;
};

export default function CreateDocumentButton({ type, quoteId, label, small }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, quoteId }),
      });
      const json = (await res.json().catch(() => null)) as { id?: number; error?: string } | null;
      if (!res.ok || !json?.id) {
        setError(json?.error ?? "作成に失敗しました。もう一度お試しください。");
        return;
      }
      router.push(`/documents/${json.id}`);
    } catch {
      setError("作成に失敗しました。通信環境を確認してください。");
    } finally {
      setPending(false);
    }
  };

  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        onClick={() => void create()}
        disabled={pending}
        className={
          small
            ? "flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:border-blue-400 hover:text-blue-700 disabled:opacity-50"
            : "flex items-center gap-1.5 rounded-md border border-blue-700 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
        }
        title={quoteId ? "この見積もりの内容をコピーして作ります" : "白紙から作ります"}
      >
        <FilePlus2 className={small ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />
        {pending ? "作成中…" : label}
      </button>
      {error && (
        <span role="alert" className="mt-1 text-xs text-red-700">
          {error}
        </span>
      )}
    </span>
  );
}
