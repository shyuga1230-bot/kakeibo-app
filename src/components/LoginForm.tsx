"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";
import { loginAction } from "@/app/actions";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, null);

  return (
    <form action={formAction} className="mt-4 space-y-3">
      <label className="block">
        <span className="text-sm font-medium">パスワード</span>
        <input
          type="password"
          name="password"
          required
          autoFocus
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
        className="flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-b from-blue-600 to-blue-700 shadow-sm shadow-blue-900/20 px-4 py-2.5 font-medium text-white hover:from-blue-700 hover:to-blue-800 disabled:opacity-50"
      >
        <LogIn className="h-4 w-4" aria-hidden />
        {pending ? "確認中…" : "ログインする"}
      </button>
    </form>
  );
}
