// 表示用の整形(画面・サーバー両方から使う)

/** 12345678 → "12,345,678" */
export function formatYen(n: number): string {
  return n.toLocaleString("ja-JP");
}

/** "2026-06-01" → "2026/6/1" (画面表示用) */
export function formatDate(isoDate: string): string {
  const m = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return isoDate;
  return `${m[1]}/${Number(m[2])}/${Number(m[3])}`;
}

/** 今日の日付を "YYYY-MM-DD" で返す(端末のローカル時刻基準) */
export function todayLocalISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "2026-07-09" → "7/9" (案件管理表のセルなど狭い場所用) */
export function formatMonthDay(isoDate: string): string {
  const m = isoDate.match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (!m) return isoDate;
  return `${Number(m[1])}/${Number(m[2])}`;
}

// フォーマッタの生成は重いので、1回だけ作って使い回す
const DATETIME_JST = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

// en-CA ロケールは YYYY-MM-DD 形式になる
const DATE_JST = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** 日時を日本時間の "2026/7/9 14:30" 形式にする(更新履歴の表示用) */
export function formatDateTimeJst(d: Date): string {
  return DATETIME_JST.format(d);
}

/** 日時を日本時間の "YYYY-MM-DD" にする(CSV出力用) */
export function toJstDateString(d: Date): string {
  return DATE_JST.format(d);
}
