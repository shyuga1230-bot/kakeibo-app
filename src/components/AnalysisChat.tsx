"use client";
// AI分析のチャット画面。日本語で質問すると、データベースの集計を根拠に
// AI(Claude Sonnet 5)が答える。計算はサーバー側で行った正確な数字を使い、
// AIは解釈と説明だけを担当する。

import { useRef, useState } from "react";
import { CircleUserRound, RotateCcw, Send, Sparkles } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

const EXAMPLES = [
  "今年いちばん売れている商品は何?去年と比べてどう?",
  "見積もりから請求までで金額が変わりやすいのはどんな案件?",
  "一緒に売れやすい商品の組み合わせから、営業のヒントを教えて",
  "先月の売上の特徴を3つ教えて",
];

export default function AnalysisChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const ask = async (question: string) => {
    const q = question.trim();
    if (q === "" || pending) return;
    setError(null);
    setInput("");
    // 画面には全部残しつつ、AIへは直近のやりとりだけを送る(送る量=料金のため)。
    // APIは「最初のメッセージ=質問(user)」を要求するため、切ったあと先頭が
    // 答え(assistant)になっていたら読み飛ばす
    const nextMessages = [...messages, { role: "user" as const, content: q }];
    setMessages(nextMessages);
    const sendWindow = nextMessages.slice(-9);
    while (sendWindow.length > 0 && sendWindow[0].role !== "user") sendWindow.shift();
    setPending(true);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    try {
      const res = await fetch("/api/analysis/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: sendWindow }),
      });
      const json = (await res.json().catch(() => null)) as
        | { text?: string; error?: string }
        | null;
      if (!res.ok || !json?.text) {
        setError(json?.error ?? "AI分析に失敗しました。もう一度お試しください。");
        return;
      }
      setMessages((prev) => [...prev, { role: "assistant", content: json.text! }]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch {
      setError("通信に失敗しました。通信環境を確認してもう一度お試しください。");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-3">
      {messages.length === 0 ? (
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
          <p className="text-sm text-slate-600">
            売上・商品・顧客・見積もり↔請求の比較データについて、日本語でそのまま質問できます。
            計算はデータベース側で行った正確な数字を使い、AIは読み解きだけを担当します。
          </p>
          <p className="mt-2 text-xs text-slate-500">
            例えばこんな質問(押すとそのまま聞けます):
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => void ask(ex)}
                className="rounded-full border border-violet-300 bg-violet-50 px-3 py-1.5 text-left text-xs text-violet-800 hover:bg-violet-100"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <p className="flex max-w-[85%] items-start gap-2 rounded-2xl rounded-tr-sm bg-blue-600 px-4 py-2.5 text-sm text-white">
                  <CircleUserRound className="mt-0.5 h-4 w-4 shrink-0 opacity-70" aria-hidden />
                  <span className="whitespace-pre-wrap break-words">{m.content}</span>
                </p>
              </div>
            ) : (
              <div key={i} className="flex justify-start">
                <div className="max-w-[95%] rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm ring-1 ring-slate-900/5">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-violet-700">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden />
                    AIの答え
                  </p>
                  <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {m.content}
                  </p>
                </div>
              </div>
            ),
          )}
          {pending && (
            <p
              role="status"
              className="flex items-center gap-2 rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-800"
            >
              <Sparkles className="h-4 w-4 animate-pulse" aria-hidden />
              AIが集計データを読んでいます…(10〜30秒ほどかかります)
            </p>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(input);
        }}
        className="flex items-end gap-2 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-900/5"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            // Enterで送信(Shift+Enterで改行)
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void ask(input);
            }
          }}
          rows={2}
          placeholder="例: 今年、去年より売れている商品は?"
          aria-label="AIへの質問"
          className="min-w-0 flex-1 resize-none rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <div className="flex shrink-0 flex-col items-end gap-1">
          <button
            type="submit"
            disabled={pending || input.trim() === ""}
            className="flex items-center gap-1.5 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" aria-hidden />
            {pending ? "考え中…" : "聞く"}
          </button>
          {messages.length > 0 && !pending && (
            <button
              type="button"
              onClick={() => {
                setMessages([]);
                setError(null);
              }}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
            >
              <RotateCcw className="h-3 w-3" aria-hidden />
              新しい質問を始める
            </button>
          )}
        </div>
      </form>

      <p className="text-xs text-slate-400">
        1つの質問あたり約5〜15円かかります。AIの読み解きは間違うことがあるため、大事な数字は
        「売上」「見積↔請求」「書類」の各画面で確認してください。
      </p>
    </div>
  );
}
