// 商品がどれくらい売れているか(見積もりに登録された件数)を4段階に分ける。
// 件数そのものではなく「一番売れている商品と比べた度合い」で判定するので、
// データが少ないうちから色の意味が変わらない。
// 色は青の濃淡(度合いが強いほど濃い)+「売上なし」だけgrey。

export type SalesLevel = {
  key: "none" | "low" | "mid" | "high";
  label: string;
  /** バッジ(件数ラベル)用のクラス */
  chipClass: string;
};

export const SALES_LEVELS: readonly SalesLevel[] = [
  { key: "none", label: "売上なし", chipClass: "bg-slate-100 text-slate-500" },
  { key: "low", label: "少なめ", chipClass: "bg-blue-100 text-blue-900" },
  { key: "mid", label: "ふつう", chipClass: "bg-blue-300 text-blue-950" },
  { key: "high", label: "多め", chipClass: "bg-blue-600 text-white" },
] as const;

/**
 * 売れている度合いを判定する。
 * 一番売れている商品(maxCount)の 2/3 以上なら「多め」、1/3 以上なら「ふつう」、
 * それ未満は「少なめ」、0件は「売上なし」。
 */
export function salesLevel(count: number, maxCount: number): SalesLevel {
  if (count <= 0 || maxCount <= 0) return SALES_LEVELS[0];
  const ratio = count / maxCount;
  if (ratio >= 2 / 3) return SALES_LEVELS[3];
  if (ratio >= 1 / 3) return SALES_LEVELS[2];
  return SALES_LEVELS[1];
}
