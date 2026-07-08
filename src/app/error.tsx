"use client";
// ページの表示中にエラーが起きたときの画面。原因の目安と対処を日本語で示す。

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";

export default function ErrorPage({
  error,
  unstable_retry,
  reset,
}: {
  error: Error & { digest?: string };
  unstable_retry?: () => void;
  reset?: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const retry = unstable_retry ?? reset;

  return (
    <div className="mx-auto mt-8 max-w-lg rounded-xl bg-white p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-bold text-red-700">
        <TriangleAlert className="h-5 w-5" aria-hidden />
        エラーが発生しました
      </h2>
      <p className="mt-2 text-sm text-slate-700">
        データの読み込みまたは保存に失敗しました。次の順でお試しください。
      </p>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
        <li>下の「もう一度読み込む」ボタンを押す</li>
        <li>それでも直らない場合は、少し時間をおいてページを再読み込みする</li>
        <li>
          繰り返し発生する場合は、データベースが停止している可能性があります。
          管理者に連絡してください(README「よくあるトラブル」参照)。
        </li>
      </ol>
      {error.digest && (
        <p className="mt-2 text-xs text-slate-400">
          エラー番号: {error.digest}(管理者への連絡時に伝えてください)
        </p>
      )}
      {retry && (
        <button
          type="button"
          onClick={() => retry()}
          className="mt-4 flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          もう一度読み込む
        </button>
      )}
    </div>
  );
}
