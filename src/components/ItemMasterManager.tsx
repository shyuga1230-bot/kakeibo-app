"use client";
// 商品マスタの管理(追加・編集・削除・過去データからの取り込み)。

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CirclePlus, Download, Pencil, Save, Trash2, X } from "lucide-react";
import {
  createMasterItemAction,
  deleteMasterItemAction,
  importMasterItemsAction,
  updateMasterItemAction,
  type ActionResult,
} from "@/app/actions";
import { formatYen } from "@/lib/format";
import type { MasterItem } from "@/lib/items";

function Message({ result }: { result: ActionResult | null }) {
  if (!result) return null;
  return result.ok ? (
    <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
      ✓ {result.message}
    </p>
  ) : (
    <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
      {result.error}
    </p>
  );
}

/** 1商品分の行(表示・編集・削除) */
function ItemRow({ item }: { item: MasterItem }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleteResult, setDeleteResult] = useState<ActionResult | null>(null);
  const [pendingDelete, startDelete] = useTransition();

  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    updateMasterItemAction.bind(null, item.id),
    null,
  );
  const handled = useRef<ActionResult | null>(null);
  useEffect(() => {
    if (!state || handled.current === state) return;
    handled.current = state;
    if (state.ok) {
      setEditing(false);
      router.refresh();
    }
  }, [state, router]);

  const confirmDelete = () => {
    if (
      !window.confirm(
        `「${item.name}」を商品から削除しますか?\n(登録済みの見積もりのデータは消えません)`,
      )
    ) {
      return;
    }
    startDelete(async () => {
      const result = await deleteMasterItemAction(item.id);
      if (result.ok) router.refresh();
      else setDeleteResult(result);
    });
  };

  if (editing) {
    return (
      <li className="rounded-lg border border-blue-200 bg-blue-50/40 p-3">
        <form action={formAction} className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            name="name"
            defaultValue={item.name}
            required
            aria-label="商品名"
            className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
          <input
            type="text"
            name="code"
            defaultValue={item.code ?? ""}
            placeholder="品番(任意)"
            aria-label="品番"
            className="w-28 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
          <input
            type="text"
            name="default_amount"
            inputMode="numeric"
            defaultValue={item.defaultAmount == null ? "" : String(item.defaultAmount)}
            placeholder="標準金額(円・任意)"
            aria-label="標準金額(円)"
            className="w-36 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-right text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={pending}
            className="flex items-center gap-1 rounded-md bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" aria-hidden />
            {pending ? "保存中…" : "保存"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            やめる
          </button>
          {state && !state.ok && (
            <p role="alert" className="w-full text-sm text-red-700">
              {state.error}
            </p>
          )}
        </form>
        <p className="mt-1 text-xs text-slate-500">
          ※名前を変えても、登録済みの見積もりの項目名は変わりません。
        </p>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="min-w-0">
        {item.code && (
          <span className="mr-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-xs tabular-nums text-slate-600">
            {item.code}
          </span>
        )}
        <span className="break-all text-sm font-medium">{item.name}</span>
        <span className="ml-2 text-xs tabular-nums text-slate-500">
          {item.defaultAmount != null ? `標準 ¥${formatYen(item.defaultAmount)}` : ""}
        </span>
        {deleteResult && !deleteResult.ok && (
          <p role="alert" className="mt-1 text-xs text-red-700">
            {deleteResult.error}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-slate-500 hover:bg-blue-50 hover:text-blue-700"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          編集
        </button>
        <button
          type="button"
          onClick={confirmDelete}
          disabled={pendingDelete}
          className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          削除
        </button>
      </div>
    </li>
  );
}

export default function ItemMasterManager({ items }: { items: MasterItem[] }) {
  const router = useRouter();
  const [createState, createAction, creating] = useActionState<
    ActionResult | null,
    FormData
  >(createMasterItemAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  const handled = useRef<ActionResult | null>(null);
  useEffect(() => {
    if (!createState || handled.current === createState) return;
    handled.current = createState;
    if (createState.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [createState, router]);

  const [importResult, setImportResult] = useState<ActionResult | null>(null);
  const [importing, startImport] = useTransition();

  return (
    <div className="space-y-4">
      <form
        ref={formRef}
        action={createAction}
        className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-blue-400 bg-blue-50/40 p-3"
      >
        <input
          type="text"
          name="name"
          required
          placeholder="商品名(例: 3D起工測量)"
          aria-label="商品名"
          className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <input
          type="text"
          name="code"
          placeholder="品番(任意)"
          aria-label="品番"
          className="w-32 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <input
          type="text"
          name="default_amount"
          inputMode="numeric"
          placeholder="標準金額(円・任意)"
          aria-label="標準金額(円)"
          className="w-40 rounded-md border border-slate-300 bg-white px-3 py-2 text-right text-sm focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={creating}
          className="flex items-center gap-1.5 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
        >
          <CirclePlus className="h-4 w-4" aria-hidden />
          {creating ? "登録中…" : "商品を登録する"}
        </button>
        <div className="w-full">
          <Message result={createState} />
        </div>
      </form>

      {items.length === 0 ? (
        <div className="rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-600">
          <p>まだ商品が登録されていません。</p>
          <p className="mt-1 text-xs text-slate-500">
            上の欄から登録するか、下のボタンで過去に見積もりへ登録した項目名をまとめて取り込めます。
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </ul>
      )}

      <div className="space-y-2 border-t border-slate-100 pt-3">
        <button
          type="button"
          disabled={importing}
          onClick={() =>
            startImport(async () => {
              const result = await importMasterItemsAction();
              setImportResult(result);
              if (result.ok) router.refresh();
            })
          }
          className="flex items-center gap-1.5 rounded-md border border-blue-700 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
        >
          <Download className="h-4 w-4" aria-hidden />
          {importing ? "取り込み中…" : "過去の見積もりから商品名を取り込む"}
        </button>
        <Message result={importResult} />
      </div>
    </div>
  );
}
