// 画面内の部品どうしの連絡用イベント。
// 登録・編集・削除が成功したときに発火し、ヘッダーのサマリーが再集計される。

export const DATA_CHANGED_EVENT = "quote-data-changed";

export function notifyDataChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
  }
}

// 案件管理のデータが変わったとき用(ヘッダーの案件サマリーが再集計される)
export const PROJECT_DATA_CHANGED_EVENT = "project-data-changed";

export function notifyProjectDataChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PROJECT_DATA_CHANGED_EVENT));
  }
}
