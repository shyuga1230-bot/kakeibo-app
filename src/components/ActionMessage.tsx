// サーバー処理の結果(成功・エラー)を表示する共通の帯。
import type { ActionResult } from "@/app/actions";

export default function ActionMessage({ result }: { result: ActionResult | null }) {
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
