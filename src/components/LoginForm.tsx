"use client";

import { useActionState, useEffect, useRef } from "react";
import { LogIn } from "lucide-react";
import { loginAction } from "@/app/actions";

// 前回入力した名前をこの端末に覚えておくためのキー
const NAME_STORAGE_KEY = "ark-login-name";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, null);
  const nameRef = useRef<HTMLInputElement>(null);

  // 前回の名前を自動で入れる(端末ごとに記憶)
  useEffect(() => {
    const saved = localStorage.getItem(NAME_STORAGE_KEY);
    if (saved && nameRef.current && nameRef.current.value === "") {
      nameRef.current.value = saved;
    }
  }, []);

  return (
    <form
      action={formAction}
      onSubmit={() => {
        const name = nameRef.current?.value.trim();
        if (name) localStorage.setItem(NAME_STORAGE_KEY, name);
      }}
      className="mt-4 space-y-3"
    >
      <label className="block">
        <span className="text-sm font-medium">お名前</span>
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
