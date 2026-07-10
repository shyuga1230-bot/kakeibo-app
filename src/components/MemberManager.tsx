"use client";
// 社員名簿の管理(追加・名前の変更・削除)。
// ここに登録した名前が、ログイン画面のプルダウンに出る。

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CirclePlus, Pencil, Save, Trash2, X } from "lucide-react";
import {
  createMemberAction,
  deleteMemberAction,
  updateMemberAction,
  type ActionResult,
} from "@/app/actions";
import type { Member } from "@/lib/members";

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

/** 1人分の行(表示・編集・削除) */
function MemberRow({ member }: { member: Member }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleteResult, setDeleteResult] = useState<ActionResult | null>(null);
  const [pendingDelete, startDelete] = useTransition();

  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    updateMemberAction.bind(null, member.id),
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
        `「${member.name}」さんを名簿から削除しますか?\n(過去の記録に残っている名前は消えません)`,
      )
    ) {
      return;
    }
    startDelete(async () => {
      const result = await deleteMemberAction(member.id);
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
            defaultValue={member.name}
            required
            maxLength={30}
            aria-label="名前"
            className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={pending}
            className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" aria-hidden />
            {pending ? "保存中…" : "保存"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
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
          ※名前を変えても、過去の記録に残っている名前は変わりません。
        </p>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
      <span className="min-w-0 break-all text-sm font-medium">{member.name}</span>
      {deleteResult && !deleteResult.ok && (
        <p role="alert" className="text-xs text-red-700">
          {deleteResult.error}
        </p>
      )}
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

export default function MemberManager({ members }: { members: Member[] }) {
  const router = useRouter();
  const [createState, createAction, creating] = useActionState<
    ActionResult | null,
    FormData
  >(createMemberAction, null);
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
          maxLength={30}
          placeholder="名前(例: 山田)"
          aria-label="名前"
          className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={creating}
          className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <CirclePlus className="h-4 w-4" aria-hidden />
          {creating ? "登録中…" : "名簿に登録する"}
        </button>
        <div className="w-full">
          <Message result={createState} />
        </div>
      </form>

      {members.length === 0 ? (
        <div className="rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-600">
          <p>まだ誰も登録されていません。</p>
          <p className="mt-1 text-xs text-slate-500">
            登録すると、ログイン画面の名前がプルダウンで選べるようになります。
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {members.map((m) => (
            <MemberRow key={m.id} member={m} />
          ))}
        </ul>
      )}
    </div>
  );
}
