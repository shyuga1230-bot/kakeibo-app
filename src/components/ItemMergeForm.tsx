"use client";
// 商品の統合(名寄せ)フォーム。
// 「3次元起工測量」と「3D起工測量」のような表記ゆれを1つにまとめる。
// 過去の見積もりの明細もまとめて書き換わるため、実行前に確認を出す。

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Merge } from "lucide-react";
import { mergeItemsAction, type ActionResult } from "@/app/actions";

type Props = {
  /** 商品名と、見積もりに登場した件数 */
  items: { name: string; salesCount: number }[];
};

export default function ItemMergeForm({ items }: Props) {
  const router = useRouter();
  const [fromName, setFromName] = useState("");
  const [toName, setToName] = useState("");
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    mergeItemsAction,
    null,
  );
  const handled = useRef<ActionResult | null>(null);
  useEffect(() => {
    if (!state || handled.current === state) return;
    handled.current = state;
    if (state.ok) {
      setFromName("");
      setToName("");
      router.refresh();
    }
  }, [state, router]);

  const fromCount = items.find((i) => i.name === fromName)?.salesCount ?? 0;

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `「${fromName}」を「${toName}」に統合しますか?\n\n` +
              `・商品「${fromName}」は商品管理から消えます\n` +
              `・過去の見積もり ${fromCount}件の明細の名前も「${toName}」に書き換わります\n` +
              `・売上や併売の集計も「${toName}」にまとまります\n\n` +
              `この操作は元に戻せません。`,
          )
        ) {
          e.preventDefault();
        }
      }}
      className="space-y-2"
    >
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <select
          name="from_name"
          value={fromName}
          onChange={(e) => setFromName(e.target.value)}
          required
          aria-label="統合してなくす商品"
          className="min-w-0 flex-1 basis-48 rounded-md border border-slate-300 bg-white px-2 py-2 focus:border-blue-500 focus:outline-none"
        >
          <option value="" disabled>
            まとめたい商品(なくなる方)…
          </option>
          {items
            .filter((i) => i.name !== toName)
            .map((i) => (
              <option key={i.name} value={i.name}>
                {i.name}({i.salesCount}件)
              </option>
            ))}
        </select>
        <span className="shrink-0 text-slate-500">→</span>
        <select
          name="to_name"
          value={toName}
          onChange={(e) => setToName(e.target.value)}
          required
          aria-label="統合先の商品"
          className="min-w-0 flex-1 basis-48 rounded-md border border-slate-300 bg-white px-2 py-2 focus:border-blue-500 focus:outline-none"
        >
          <option value="" disabled>
            統合先の商品(残る方)…
          </option>
          {items
            .filter((i) => i.name !== fromName)
            .map((i) => (
              <option key={i.name} value={i.name}>
                {i.name}({i.salesCount}件)
              </option>
            ))}
        </select>
        <button
          type="submit"
          disabled={pending || fromName === "" || toName === ""}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-blue-700 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
        >
          <Merge className="h-4 w-4" aria-hidden />
          {pending ? "統合中…" : "統合する"}
        </button>
      </div>
      {state &&
        (state.ok ? (
          <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            ✓ {state.message}
          </p>
        ) : (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        ))}
    </form>
  );
}
