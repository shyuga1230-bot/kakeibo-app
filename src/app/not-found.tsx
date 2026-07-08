// 存在しないページを開いたときの画面
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto mt-8 max-w-lg rounded-xl bg-white p-6 text-center shadow-sm">
      <h2 className="text-lg font-bold">ページが見つかりません</h2>
      <p className="mt-2 text-sm text-slate-600">
        お探しのページは削除されたか、住所(URL)が間違っている可能性があります。
      </p>
      <Link
        href="/"
        className="mt-4 inline-block rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
      >
        登録画面に戻る
      </Link>
    </div>
  );
}
