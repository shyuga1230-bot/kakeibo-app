// 納品書・請求書の計算と共通の決めごと。
// 画面(編集中のライブ計算)とサーバー(保存時の再計算)の両方から使うため、
// 外部に依存しない純粋な関数だけを置く。

export const DOC_TYPES = {
  invoice: { label: "請求書", title: "御請求書", greeting: "下記の通りご請求申し上げます。" },
  delivery: { label: "納品書", title: "納品書", greeting: "下記の通り納品いたしました。" },
} as const;

export type DocType = keyof typeof DOC_TYPES;

export function isDocType(v: unknown): v is DocType {
  return v === "invoice" || v === "delivery";
}

export type DocItemInput = {
  name: string;
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
  amount: number | null;
};

// 金額の上限(見積もりと同じ、データベースの整数型に収まる範囲)
export const MAX_AMOUNT = 2_000_000_000;

/**
 * 明細1行の金額。単価が入っていれば 数量×単価(四捨五入)、
 * 空なら手入力の金額をそのまま使う。
 */
export function lineAmount(item: {
  quantity: number | null;
  unitPrice: number | null;
  amount: number | null;
}): number {
  if (item.unitPrice != null) {
    const qty = item.quantity ?? 1;
    const n = Math.round(qty * item.unitPrice);
    return Number.isFinite(n) ? Math.max(0, Math.min(n, MAX_AMOUNT)) : 0;
  }
  return Math.max(0, Math.min(item.amount ?? 0, MAX_AMOUNT));
}

export type DocTotals = { subtotal: number; tax: number; total: number };

/** 小計(税抜)・消費税(切り捨て)・合計(税込) */
export function docTotals(
  items: { quantity: number | null; unitPrice: number | null; amount: number | null }[],
  taxRate: number,
): DocTotals {
  const subtotal = items.reduce((sum, item) => sum + lineAmount(item), 0);
  const tax = Math.floor((subtotal * taxRate) / 100);
  return { subtotal, tax, total: subtotal + tax };
}

/**
 * 次の書類番号。"YYYY-0001" の形で、同じ年の中で連番にする。
 * latest には同じ種類・同じ年のいちばん大きい番号を渡す(無ければ null)。
 */
export function nextDocNumber(latest: string | null, year: number): string {
  const m = latest?.match(/^(\d{4})-(\d+)$/);
  const seq = m && Number(m[1]) === year ? Number(m[2]) + 1 : 1;
  return `${year}-${String(seq).padStart(4, "0")}`;
}

/**
 * 請求書の支払期限の初期値: 発行月の翌月末("月末締め・翌月末払い"が一般的なため)。
 * あとから画面で自由に変えられる。
 */
export function endOfNextMonth(isoDate: string): string | null {
  const m = isoDate.match(/^(\d{4})-(\d{2})-\d{2}$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]); // 1〜12
  // 翌々月の0日目 = 翌月の末日(UTCで計算して日付のずれを防ぐ)
  const d = new Date(Date.UTC(year, month + 1, 0));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
