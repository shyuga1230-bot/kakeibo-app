"use client";
// 見積もりの入力フォーム。新規登録と編集の両方で使う。
// ・項目は商品マスタからプルダウンで選ぶ(表記ゆれ防止)。
//   新しい商品のときだけ「＋ 新しい商品名を入力する」を選んで書く
// ・項目行の追加/削除
// ・日本語入力(IME)の変換確定 Enter で誤登録しないよう、
//   1行入力欄では Enter でフォームを送信しない(登録はボタンでのみ実行)

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CirclePlus, Save, Trash2 } from "lucide-react";
import { createQuoteAction, updateQuoteAction, type ActionResult } from "@/app/actions";
import { normalizeItemName } from "@/lib/normalize";
import { todayLocalISO } from "@/lib/format";
import { notifyDataChanged } from "@/lib/events";

type ItemRow = {
  key: number;
  name: string;
  amount: string;
  /** true のとき「新しい商品名」をテキストで入力中 */
  custom: boolean;
};

/** 見積書の読み取り結果などで、フォームに最初から入れておく内容 */
export type QuoteFormPrefill = {
  quoteDate: string;
  customerName: string;
  memo: string;
  items: { name: string; amount: string }[];
};

type Props = {
  /** 商品マスタ(項目のプルダウンの選択肢になる) */
  masterItems?: { name: string; defaultAmount: number | null }[];
  /** 編集時のみ指定 */
  edit?: QuoteFormPrefill & { quoteId: number };
  /** 新規登録時に、あらかじめ入れておく内容(見積書の読み取り結果など) */
  prefill?: QuoteFormPrefill;
};

let nextKey = 1;
function newRow(name = "", amount = "", custom = false): ItemRow {
  return { key: nextKey++, name, amount, custom };
}

export default function QuoteForm({ masterItems, edit, prefill }: Props) {
  const router = useRouter();
  const isEdit = Boolean(edit);
  const initial = edit ?? prefill;

  const [date, setDate] = useState(initial?.quoteDate ?? "");
  const [customer, setCustomer] = useState(initial?.customerName ?? "");
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [rows, setRows] = useState<ItemRow[]>(() =>
    initial && initial.items.length > 0
      ? initial.items.map((i) => newRow(i.name, i.amount))
      : [newRow()],
  );

  // 日付の初期値は「今日」。サーバーとの時差ずれを避けるため画面側で設定する。
  useEffect(() => {
    if (!isEdit && date === "") setDate(todayLocalISO());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const action = useMemo(
    () => (isEdit ? updateQuoteAction.bind(null, edit!.quoteId) : createQuoteAction),
    [isEdit, edit],
  );
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    action,
    null,
  );

  // 送信結果への反応(成功したらサマリー更新・フォームのリセットなど)
  const handledState = useRef<ActionResult | null>(null);
  useEffect(() => {
    if (!state || handledState.current === state) return;
    handledState.current = state;
    if (state.ok) {
      notifyDataChanged();
      if (isEdit) {
        router.push("/history");
        router.refresh();
      } else {
        // 日付は同じ日に続けて入力することが多いので残す
        setCustomer("");
        setMemo("");
        setRows([newRow()]);
      }
    }
  }, [state, isEdit, router]);

  // 正規化した項目名が重複していたら送信前に注意を出す
  const duplicateNames = useMemo(() => {
    const names = rows.map((r) => normalizeItemName(r.name)).filter((n) => n !== "");
    const seen = new Set<string>();
    const dup = new Set<string>();
    for (const n of names) {
      if (seen.has(n)) dup.add(n);
      seen.add(n);
    }
    return [...dup];
  }, [rows]);

  // 1行入力欄(input)では Enter キーで送信しない。
  // IMEの変換確定 Enter も、押し間違いの Enter もここで止まる。
  const blockEnterSubmit = (e: React.KeyboardEvent<HTMLFormElement>) => {
    const target = e.target as HTMLElement;
    if (e.key === "Enter" && target.tagName === "INPUT") {
      e.preventDefault();
    }
  };

  const updateRow = (key: number, patch: Partial<ItemRow>) => {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const masterNames = useMemo(
    () => new Set((masterItems ?? []).map((m) => m.name)),
    [masterItems],
  );

  /** プルダウンで商品を選んだとき(「新しい商品名」を選ぶと入力欄に切り替わる) */
  const handleSelect = (key: number, value: string) => {
    if (value === "__new__") {
      updateRow(key, { custom: true, name: "" });
      return;
    }
    const master = (masterItems ?? []).find((m) => m.name === value);
    setRows((rs) =>
      rs.map((r) =>
        r.key === key
          ? {
              ...r,
              name: value,
              // 金額が空なら標準金額を自動で入れる
              amount:
                r.amount.trim() === "" && master?.defaultAmount != null
                  ? String(master.defaultAmount)
                  : r.amount,
            }
          : r,
      ),
    );
  };

  return (
    <form action={formAction} onKeyDown={blockEnterSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">
            日付 <span className="text-red-600">*</span>
          </span>
          <input
            type="date"
            name="quote_date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">顧客名(任意)</span>
          <input
            type="text"
            name="customer_name"
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            placeholder="例: 山田建設"
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </label>
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium">
            売れた項目 <span className="text-red-600">*</span>
          </span>
          <span className="text-xs text-slate-500">金額は空欄でもかまいません</span>
        </div>
        <div className="mt-1 space-y-2">
          {rows.map((row, idx) => (
            <div key={row.key} className="flex items-center gap-2">
              {row.custom ? (
                <input
                  type="text"
                  name="item_name"
                  value={row.name}
                  onChange={(e) => updateRow(row.key, { name: e.target.value })}
                  placeholder="新しい商品名を入力"
                  autoFocus
                  aria-label={`${idx + 1}行目の新しい商品名`}
                  className="min-w-0 flex-1 rounded-md border border-blue-400 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
              ) : (
                <>
                  <select
                    value={row.name}
                    onChange={(e) => handleSelect(row.key, e.target.value)}
                    aria-label={`${idx + 1}行目の商品`}
                    className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">商品を選ぶ…</option>
                    {(masterItems ?? []).map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                    {row.name !== "" && !masterNames.has(row.name) && (
                      <option value={row.name}>{row.name}</option>
                    )}
                    <option value="__new__">＋ 新しい商品名を入力する</option>
                  </select>
                  <input type="hidden" name="item_name" value={row.name} />
                </>
              )}
              <input
                type="text"
                name="item_amount"
                inputMode="numeric"
                value={row.amount}
                onChange={(e) => updateRow(row.key, { amount: e.target.value })}
                placeholder="金額(円)"
                aria-label={`${idx + 1}行目の金額(円)`}
                className="w-28 rounded-md border border-slate-300 bg-white px-3 py-2 text-right focus:border-blue-500 focus:outline-none sm:w-36"
              />
              <button
                type="button"
                onClick={() => setRows((rs) => rs.filter((r) => r.key !== row.key))}
                disabled={rows.length === 1}
                title="この行を消す"
                aria-label={`${idx + 1}行目を消す`}
                className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setRows((rs) => [...rs, newRow()])}
          className="mt-2 flex items-center gap-1 rounded-md border border-dashed border-blue-400 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50"
        >
          <CirclePlus className="h-4 w-4" aria-hidden />
          項目を追加する
        </button>
        <p className="mt-1 text-xs text-slate-500">
          金額は「1,200,000」「¥1200000」「全角数字」のままでも登録できます。
          新しい商品名で登録すると、自動で「商品管理」にも追加され、次回から選べるようになります。
        </p>
      </div>

      <label className="block">
        <span className="text-sm font-medium">メモ(任意)</span>
        <textarea
          name="memo"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={2}
          placeholder="例: 現場は◯◯市。次回の講習も検討中。"
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none"
        />
      </label>

      {duplicateNames.length > 0 && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          同じ項目名が2回入力されています:{duplicateNames.join("、")}
          。1つにまとめてください。
        </p>
      )}
      {state && !state.ok && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state?.ok && !isEdit && (
        <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          ✓ {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || duplicateNames.length > 0}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-700 px-4 py-3 text-base font-medium text-white hover:bg-blue-800 disabled:opacity-50 sm:w-auto sm:px-8"
      >
        <Save className="h-5 w-5" aria-hidden />
        {pending
          ? "保存中…"
          : isEdit
            ? "変更を保存する"
            : "この内容で登録する"}
      </button>
    </form>
  );
}
