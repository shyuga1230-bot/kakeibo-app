"use client";
// 納品書・請求書の編集画面。
// 左に入力フォーム、右に印刷そのままのプレビュー(A4)を表示する。
// 「保存」で /api/documents/[id] に送り、「印刷 / PDF保存」はブラウザの印刷を開く
// (印刷画面で「PDFに保存」を選ぶとPDFになる)。

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  Plus,
  Printer,
  Save,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import DocumentSheet from "@/components/DocumentSheet";
import { DOC_TYPES, docTotals, lineAmount, type DocItemInput } from "@/lib/document-calc";
import type { CompanyInfo } from "@/lib/company";
import type { DocumentWithItems } from "@/lib/documents";
import { formatYen } from "@/lib/format";

type ItemRow = DocItemInput & { key: number };

type Props = {
  doc: DocumentWithItems;
  company: CompanyInfo;
};

const inputCls =
  "w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none";

/** 数字の入力欄の値 → number | null("" は null) */
function toNum(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export default function DocumentEditor({ doc, company }: Props) {
  const router = useRouter();
  const def = DOC_TYPES[doc.type];

  const [docNumber, setDocNumber] = useState(doc.docNumber);
  const [issueDate, setIssueDate] = useState(doc.issueDate);
  const [dueDate, setDueDate] = useState(doc.dueDate ?? "");
  const [customerName, setCustomerName] = useState(doc.customerName);
  const [honorific, setHonorific] = useState(doc.honorific);
  const [subject, setSubject] = useState(doc.subject ?? "");
  const [note, setNote] = useState(doc.note ?? "");
  const [taxRate, setTaxRate] = useState(doc.taxRate);
  const [items, setItems] = useState<ItemRow[]>(() =>
    doc.items.length === 0
      ? // 白紙から作ったときは、すぐ書き始められるよう空の1行を出しておく
        [{ key: 0, name: "", quantity: 1, unit: "式", unitPrice: null, amount: null }]
      : doc.items.map((item, i) => ({
          key: i,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          amount: item.amount,
        })),
  );
  const [nextKey, setNextKey] = useState(Math.max(1, doc.items.length));

  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copying, setCopying] = useState(false);

  const touch = () => {
    setDirty(true);
    setSavedAt(null);
  };

  const updateItem = (key: number, patch: Partial<DocItemInput>) => {
    setItems((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    touch();
  };
  const removeItem = (key: number) => {
    setItems((prev) => prev.filter((r) => r.key !== key));
    touch();
  };
  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { key: nextKey, name: "", quantity: 1, unit: "式", unitPrice: null, amount: null },
    ]);
    setNextKey((k) => k + 1);
    touch();
  };

  const sheetData = useMemo(
    () => ({
      type: doc.type,
      docNumber,
      issueDate,
      dueDate: dueDate || null,
      customerName,
      honorific,
      subject: subject || null,
      note: note || null,
      taxRate,
      createdBy: doc.createdBy,
      items: items.filter((r) => r.name.trim() !== ""),
    }),
    [doc.type, doc.createdBy, docNumber, issueDate, dueDate, customerName, honorific, subject, note, taxRate, items],
  );
  const totals = docTotals(sheetData.items, taxRate);

  const save = async (): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docNumber,
          issueDate,
          dueDate: dueDate || null,
          customerName,
          honorific,
          subject: subject || null,
          note: note || null,
          taxRate,
          items: items.map(({ key: _key, ...item }) => item),
        }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(json?.error ?? "保存に失敗しました。もう一度お試しください。");
        return false;
      }
      setDirty(false);
      setSavedAt(new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }));
      return true;
    } catch {
      setError("保存に失敗しました。通信環境を確認してもう一度お試しください。");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const print = async () => {
    // 印刷前に未保存の変更を保存してから印刷する
    if (dirty && !(await save())) return;
    window.print();
  };

  const copyAsOther = async () => {
    const otherType = doc.type === "invoice" ? "delivery" : "invoice";
    if (dirty && !(await save())) return;
    setCopying(true);
    setError(null);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: otherType, copyFromId: doc.id }),
      });
      const json = (await res.json().catch(() => null)) as { id?: number; error?: string } | null;
      if (!res.ok || !json?.id) {
        setError(json?.error ?? "作成に失敗しました。もう一度お試しください。");
        return;
      }
      router.push(`/documents/${json.id}`);
    } catch {
      setError("作成に失敗しました。通信環境を確認してもう一度お試しください。");
    } finally {
      setCopying(false);
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(json?.error ?? "削除に失敗しました。");
        setConfirmDelete(false);
        return;
      }
      router.push("/documents");
    } catch {
      setError("削除に失敗しました。通信環境を確認してもう一度お試しください。");
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  const otherLabel = DOC_TYPES[doc.type === "invoice" ? "delivery" : "invoice"].label;

  return (
    <div className="space-y-4">
      {/* 上部バー(印刷時は消える) */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Link
          href="/documents"
          className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          書類一覧へ
        </Link>
        <h2 className="text-lg font-bold">
          {def.label}の編集
          <span className="ml-2 text-sm font-normal text-slate-500">No. {docNumber}</span>
        </h2>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {savedAt && !dirty && (
            <span className="text-xs text-green-700">✓ {savedAt} に保存しました</span>
          )}
          {dirty && <span className="text-xs text-amber-600">未保存の変更があります</span>}
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" aria-hidden />
            {saving ? "保存中…" : "保存"}
          </button>
          <button
            type="button"
            onClick={() => void print()}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-md border border-blue-700 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
            title="ブラウザの印刷画面が開きます。プリンターの代わりに「PDFに保存」を選ぶとPDFファイルになります"
          >
            <Printer className="h-4 w-4" aria-hidden />
            印刷 / PDF保存
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 print:hidden">
          {error}
        </p>
      )}

      <div className="space-y-4">
        {/* 入力フォーム */}
        <div className="space-y-4 print:hidden">
          <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
            <div className="grid grid-cols-2 gap-3">
              <label className="col-span-2 block sm:col-span-1">
                <span className="text-xs font-medium text-slate-500">宛名(顧客名)</span>
                <div className="mt-1 flex gap-1.5">
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      touch();
                    }}
                    className={inputCls}
                    aria-label="宛名"
                  />
                  <select
                    value={honorific}
                    onChange={(e) => {
                      setHonorific(e.target.value);
                      touch();
                    }}
                    className="rounded-md border border-slate-300 px-1.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                    aria-label="敬称"
                  >
                    <option value="御中">御中</option>
                    <option value="様">様</option>
                    <option value="">なし</option>
                  </select>
                </div>
              </label>
              <label className="col-span-2 block sm:col-span-1">
                <span className="text-xs font-medium text-slate-500">件名(工事名など)</span>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    touch();
                  }}
                  className={`mt-1 ${inputCls}`}
                  aria-label="件名"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-500">発行日</span>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => {
                    setIssueDate(e.target.value);
                    touch();
                  }}
                  className={`mt-1 ${inputCls}`}
                  aria-label="発行日"
                />
              </label>
              {doc.type === "invoice" ? (
                <label className="block">
                  <span className="text-xs font-medium text-slate-500">お支払期限</span>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => {
                      setDueDate(e.target.value);
                      touch();
                    }}
                    className={`mt-1 ${inputCls}`}
                    aria-label="お支払期限"
                  />
                </label>
              ) : (
                <div />
              )}
              <label className="block">
                <span className="text-xs font-medium text-slate-500">書類番号</span>
                <input
                  type="text"
                  value={docNumber}
                  onChange={(e) => {
                    setDocNumber(e.target.value);
                    touch();
                  }}
                  className={`mt-1 ${inputCls}`}
                  aria-label="書類番号"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-500">消費税率(%)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={taxRate}
                  onChange={(e) => {
                    const n = Number.parseInt(e.target.value, 10);
                    setTaxRate(Number.isInteger(n) ? Math.min(100, Math.max(0, n)) : 10);
                    touch();
                  }}
                  className={`mt-1 ${inputCls}`}
                  aria-label="消費税率"
                />
              </label>
            </div>
          </section>

          {/* 明細 */}
          <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 className="shrink-0 text-sm font-bold">明細</h3>
              <p className="text-xs text-slate-500">
                単価を入れると金額は 数量×単価 で自動計算。単価が空なら金額を直接入力できます。
              </p>
            </div>
            <div className="mt-2 space-y-2">
              {/* 見出し(スマホでは非表示) */}
              <div className="hidden grid-cols-[minmax(0,1fr)_4.5rem_4rem_6rem_6.5rem_2rem] gap-1.5 text-[11px] text-slate-400 sm:grid">
                <span>品名</span>
                <span>数量</span>
                <span>単位</span>
                <span className="text-right">単価</span>
                <span className="text-right">金額</span>
                <span />
              </div>
              {items.map((row) => (
                <div
                  key={row.key}
                  className="grid grid-cols-2 gap-1.5 rounded-lg border border-slate-200 p-2 sm:grid-cols-[minmax(0,1fr)_4.5rem_4rem_6rem_6.5rem_2rem] sm:border-0 sm:p-0"
                >
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => updateItem(row.key, { name: e.target.value })}
                    placeholder="品名"
                    aria-label="品名"
                    className={`col-span-2 sm:col-span-1 ${inputCls}`}
                  />
                  <input
                    type="number"
                    value={row.quantity ?? ""}
                    min={0}
                    step="any"
                    onChange={(e) => updateItem(row.key, { quantity: toNum(e.target.value) })}
                    placeholder="数量"
                    aria-label="数量"
                    className={inputCls}
                  />
                  <input
                    type="text"
                    value={row.unit ?? ""}
                    onChange={(e) => updateItem(row.key, { unit: e.target.value || null })}
                    placeholder="単位"
                    aria-label="単位"
                    className={inputCls}
                  />
                  <input
                    type="number"
                    value={row.unitPrice ?? ""}
                    min={0}
                    onChange={(e) => updateItem(row.key, { unitPrice: toNum(e.target.value) })}
                    placeholder="単価"
                    aria-label="単価"
                    className={`text-right ${inputCls}`}
                  />
                  {row.unitPrice != null ? (
                    <span
                      className="flex items-center justify-end px-2 text-sm tabular-nums text-slate-600"
                      title="数量×単価で自動計算"
                    >
                      {formatYen(lineAmount(row))}
                    </span>
                  ) : (
                    <input
                      type="number"
                      value={row.amount ?? ""}
                      min={0}
                      onChange={(e) => updateItem(row.key, { amount: toNum(e.target.value) })}
                      placeholder="金額"
                      aria-label="金額"
                      className={`text-right ${inputCls}`}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeItem(row.key)}
                    aria-label="この行を削除"
                    className="flex items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addItem}
              className="mt-2 flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:border-blue-400 hover:text-blue-700"
            >
              <Plus className="h-4 w-4" aria-hidden />
              行を追加する
            </button>
            <p className="mt-3 border-t border-slate-100 pt-2 text-right text-sm">
              小計 ¥{formatYen(totals.subtotal)} + 消費税 ¥{formatYen(totals.tax)} ={" "}
              <b className="tabular-nums">¥{formatYen(totals.total)}</b>
              <span className="text-xs text-slate-500">(税込)</span>
            </p>
          </section>

          <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
            <label className="block">
              <span className="text-xs font-medium text-slate-500">備考(書類の下に印字されます)</span>
              <textarea
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  touch();
                }}
                rows={2}
                className={`mt-1 ${inputCls}`}
                aria-label="備考"
              />
            </label>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => void copyAsOther()}
              disabled={copying || saving}
              className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              title={`この内容をコピーして${otherLabel}を作ります`}
            >
              <Copy className="h-4 w-4" aria-hidden />
              {copying ? "作成中…" : `この内容で${otherLabel}も作る`}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-slate-500 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              この書類を削除
            </button>
          </div>
        </div>

        {/* プレビュー(印刷ではこの部分だけが出る) */}
        <div className="min-w-0">
          <p className="mb-2 text-xs text-slate-500 print:hidden">
            プレビュー(印刷するとこのまま出ます)
          </p>
          <div className="print-area overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-900/5">
            <DocumentSheet data={sheetData} company={company} />
          </div>
        </div>
      </div>

      {/* 削除の確認ダイアログ */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm print:hidden"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting) setConfirmDelete(false);
          }}
        >
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="flex items-center gap-2 text-base font-bold text-red-700">
              <TriangleAlert className="h-5 w-5" aria-hidden />
              この書類を削除しますか?
            </h3>
            <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {def.label} No. {docNumber}({customerName || "宛名なし"})
            </p>
            <p className="mt-3 text-sm font-medium text-red-700">
              削除すると<b>全員の画面から消えます</b>。間違えた場合は「ごみ箱」から30日以内なら戻せます。
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                キャンセル(削除しない)
              </button>
              <button
                type="button"
                onClick={() => void doDelete()}
                disabled={deleting}
                className="flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                {deleting ? "削除中…" : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
