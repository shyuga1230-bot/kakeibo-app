// 画面内の部品どうしの連絡用イベント。
// 登録・編集・削除が成功したときに発火し、ヘッダーのサマリーが再集計される。

export const DATA_CHANGED_EVENT = "quote-data-changed";

export function notifyDataChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
  }
}
