"use client";
// アプリ全体が表示できないほどのエラーが起きたときの最終防衛ライン。
// (この画面は独自に <html> と <body> を持つ必要がある)

export default function GlobalError({
  error,
  unstable_retry,
  reset,
}: {
  error: Error & { digest?: string };
  unstable_retry?: () => void;
  reset?: () => void;
}) {
  const retry = unstable_retry ?? reset;
  return (
    <html lang="ja">
      <body style={{ fontFamily: "sans-serif", padding: "2rem", background: "#f1f5f9" }}>
        <div
          style={{
            maxWidth: "32rem",
            margin: "2rem auto",
            background: "white",
            borderRadius: "0.75rem",
            padding: "1.5rem",
          }}
        >
          <h2 style={{ color: "#b91c1c", fontSize: "1.1rem", fontWeight: "bold" }}>
            エラーが発生しました
          </h2>
          <p style={{ marginTop: "0.5rem", fontSize: "0.9rem", color: "#334155" }}>
            画面を表示できませんでした。ページを再読み込みしても直らない場合は、
            管理者に連絡してください。
          </p>
          {error?.digest && (
            <p style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#94a3b8" }}>
              エラー番号: {error.digest}
            </p>
          )}
          {retry && (
            <button
              type="button"
              onClick={() => retry()}
              style={{
                marginTop: "1rem",
                background: "#1d4ed8",
                color: "white",
                border: "none",
                borderRadius: "0.375rem",
                padding: "0.5rem 1rem",
                cursor: "pointer",
              }}
            >
              もう一度読み込む
            </button>
          )}
        </div>
      </body>
    </html>
  );
}
