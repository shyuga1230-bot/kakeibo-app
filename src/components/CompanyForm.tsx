"use client";
// 自社情報の入力フォーム。保存すると納品書・請求書にそのまま印字される。

import { useState } from "react";
import { Save } from "lucide-react";
import type { CompanyInfo } from "@/lib/company";

const inputCls =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

export default function CompanyForm({ company }: { company: CompanyInfo }) {
  const [form, setForm] = useState({
    name: company.name,
    postal: company.postal ?? "",
    address: company.address ?? "",
    tel: company.tel ?? "",
    fax: company.fax ?? "",
    email: company.email ?? "",
    invoiceRegNo: company.invoiceRegNo ?? "",
    bankInfo: company.bankInfo ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(json?.error ?? "保存に失敗しました。もう一度お試しください。");
        return;
      }
      setSaved(true);
    } catch {
      setError("保存に失敗しました。通信環境を確認してもう一度お試しください。");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-xs font-medium text-slate-500">会社名(必ず入れてください)</span>
          <input
            type="text"
            value={form.name}
            onChange={set("name")}
            placeholder="例: 株式会社Ark"
            aria-label="会社名"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-500">郵便番号</span>
          <input
            type="text"
            value={form.postal}
            onChange={set("postal")}
            placeholder="例: 123-4567"
            aria-label="郵便番号"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-500">住所</span>
          <input
            type="text"
            value={form.address}
            onChange={set("address")}
            placeholder="例: ○○県○○市○○1-2-3"
            aria-label="住所"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-500">電話番号</span>
          <input type="text" value={form.tel} onChange={set("tel")} aria-label="電話番号" className={inputCls} />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-500">FAX(任意)</span>
          <input type="text" value={form.fax} onChange={set("fax")} aria-label="FAX" className={inputCls} />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-500">メールアドレス(任意)</span>
          <input type="text" value={form.email} onChange={set("email")} aria-label="メールアドレス" className={inputCls} />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-500">
            インボイスの登録番号(任意・T+13桁)
          </span>
          <input
            type="text"
            value={form.invoiceRegNo}
            onChange={set("invoiceRegNo")}
            placeholder="例: T1234567890123"
            aria-label="インボイスの登録番号"
            className={inputCls}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs font-medium text-slate-500">
            振込先(請求書に印字されます。銀行名・支店名・口座番号・名義など)
          </span>
          <textarea
            value={form.bankInfo}
            onChange={set("bankInfo")}
            rows={3}
            placeholder={"例: ○○銀行 ○○支店 普通 1234567\nカ)アーク"}
            aria-label="振込先"
            className={inputCls}
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" aria-hidden />
          {saving ? "保存中…" : "保存する"}
        </button>
        {saved && <span className="text-sm text-green-700">✓ 保存しました</span>}
      </div>
    </div>
  );
}
