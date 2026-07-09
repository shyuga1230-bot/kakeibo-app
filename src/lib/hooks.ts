// クライアント部品で共通に使うフック。
// - useAutoReload: 「30秒ごと・タブ復帰時・データ変更イベント時に読み直す」の配線を一元化
// - useActionSuccess: useActionState の結果を1回だけ処理する定型の一元化
import { useEffect, useRef } from "react";

type AutoReloadOptions = {
  /** 何ミリ秒ごとに再読み込みするか。省略時は定期実行しない */
  intervalMs?: number;
  /** このイベントが発火したときにも再読み込みする(例: PROJECT_DATA_CHANGED_EVENT) */
  eventName?: string;
};

/**
 * 一定間隔・タブ復帰時・指定イベント時に callback を呼ぶ。
 * 画面が表示されていないとき(別タブなど)は呼ばない。
 */
export function useAutoReload(callback: () => void, options: AutoReloadOptions = {}): void {
  const { intervalMs, eventName } = options;
  // 最新の callback を使う(呼び出し側で useCallback を強制しないため)
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const run = () => {
      if (document.visibilityState !== "visible") return;
      callbackRef.current();
    };
    const timer = intervalMs ? setInterval(run, intervalMs) : undefined;
    window.addEventListener("focus", run);
    if (eventName) window.addEventListener(eventName, run);
    return () => {
      if (timer) clearInterval(timer);
      window.removeEventListener("focus", run);
      if (eventName) window.removeEventListener(eventName, run);
    };
  }, [intervalMs, eventName]);
}

/**
 * useActionState の結果(成功)を1回だけ処理する。
 * 同じ結果オブジェクトで副作用が二重に走らないよう ref で管理する定型の共通化。
 */
export function useActionSuccess<T extends { ok: boolean } | null>(
  state: T,
  onSuccess: () => void,
): void {
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const handled = useRef<T | null>(null);
  useEffect(() => {
    if (!state || handled.current === state) return;
    handled.current = state;
    if (state.ok) onSuccessRef.current();
  }, [state]);
}
