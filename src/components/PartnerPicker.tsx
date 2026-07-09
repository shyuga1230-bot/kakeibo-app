"use client";
// 協力会社の入力欄。マスタからプルダウンで選ぶ(表記ゆれ防止)。
// 「＋ 新しい会社名を入力する」を選ぶと自由入力になり、保存時にマスタへ自動登録される。

import { useState } from "react";
import type { Partner } from "@/lib/partners";

const NEW_VALUE = "__new__";

type Props = {
  /** フォームで送る名前(例: partner_name) */
  name: string;
  defaultValue: string | null;
  partners: Partner[];
};

export default function PartnerPicker({ name, defaultValue, partners }: Props) {
  // 初期値がマスタに無い会社名の場合も、選択肢として出す(値を失わないため)
  const known = partners.some((p) => p.name === defaultValue);
  const [selected, setSelected] = useState(defaultValue ?? "");

  if (selected === NEW_VALUE) {
    return (
      <div className="mt-1 flex gap-2">
        <input
          type="text"
          name={name}
          autoFocus
          placeholder="新しい会社名"
          className="block w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setSelected(defaultValue ?? "")}
          className="shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          選び直す
        </button>
      </div>
    );
  }

  return (
    <select
      name={name}
      value={selected}
      onChange={(e) => setSelected(e.target.value)}
      className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
    >
      <option value="">(指定なし)</option>
      {!known && defaultValue && <option value={defaultValue}>{defaultValue}</option>}
      {partners.map((p) => (
        <option key={p.id} value={p.name}>
          {p.name}
        </option>
      ))}
      <option value={NEW_VALUE}>＋ 新しい会社名を入力する</option>
    </select>
  );
}
