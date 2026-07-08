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
