"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { LogIn } from "lucide-react";
import { loginAction } from "@/app/actions";

// 前回入力した名前をこの端末に覚えておくためのキー
const NAME_STORAGE_KEY = "ark-login-name";
// プルダウンの「その他(自分で入力)」用の値
const OTHER = "__other__";

export default function LoginForm({ memberNames }: { memberNames: string[] }) {
  const [state, formAction, pending] = useActionState(loginAction, null);
  const hasList = memberNames.length > 0;
  const [selected, setSelected] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  // 前回の名前を自動で選ぶ・入れる(端末ごとに記憶)
  useEffect(() => {
    const saved = localStorage.getItem(NAME_STORAGE_KEY);
    if (!saved) return;
    if (hasList && memberNames.includes(saved)) {
      setSelected(saved);
    } else if (nameRef.current && nameRef.current.value === "") {
      nameRef.current.value = saved;
      if (hasList) setSelected(OTHER);
    }
    // 初回マウント時に一度だけ実行したい
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const freeInputVisible = !hasList || selected === OTHER;

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        const form = e.currentTarget;
        const name = String(new FormData(form).get("user_name") ?? "").trim();
        if (name) localStorage.setItem(NAME_STORAGE_KEY, name);
      }}
      className="mt-4 space-y-3"
    >
      <label className="block">
        <span className="text-sm font-medium">お名前</span>
        {hasList && (
          <select
            {...(selected === OTHER ? {} : { name: "user_name" })}
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            required={selected !== OTHER}
            aria-label="名前を選ぶ"
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base focus:border-blue-500 focus:outline-none"
          >
            <option value="" disabled>
              名前を選んでください…
            </option>
            {memberNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
            <option value={OTHER}>その他(自分で入力)</option>
          </select>
        )}
        {freeInputVisible && (
          <input
            type="text"
            name="user_name"
            ref={nameRef}
            required
            maxLength={30}
            placeholder="例: 山田"
            autoComplete="username"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base focus:border-blue-500 focus:outline-none"
          />
        )}
        <span className="mt-1 block text-xs text-slate-500">
          登録や変更の記録に「誰がやったか」として残ります。
        </span>
      </label>
      <label className="block">
        <span className="text-sm font-medium">パスワード</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base focus:border-blue-500 focus:outline-none"
        />
      </label>
      {state && !state.ok && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        <LogIn className="h-4 w-4" aria-hidden />
        {pending ? "確認中…" : "ログインする"}
      </button>
    </form>
  );
}
