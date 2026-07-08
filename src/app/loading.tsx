// ページの読み込み中に表示される画面
export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24" role="status">
      <div
        className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-700"
        aria-hidden
      />
      <p className="text-sm text-slate-500">読み込み中です…</p>
    </div>
  );
}
