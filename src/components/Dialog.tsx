"use client";
// 画面中央に出すダイアログの共通の枠(オーバーレイ・タイトル行・閉じるボタン)。
// 背景クリックで閉じる(処理中は閉じない)。中身はそれぞれの画面が入れる。

import type { ReactNode } from "react";
import { X } from "lucide-react";

type Props = {
  /** aria-labelledby と対応させるタイトル要素のid */
  titleId: string;
  /** タイトル行の左側(見出しや説明) */
  header: ReactNode;
  /** 処理中は閉じる操作を受け付けない */
  pending: boolean;
  onClose: () => void;
  /** パネルに追加するクラス(縦スクロールが必要な場合など) */
  panelClassName?: string;
  children: ReactNode;
};

export default function Dialog({
  titleId,
  header,
  pending,
  onClose,
  panelClassName = "",
  children,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onClose();
      }}
    >
      <div className={`w-full max-w-md rounded-xl bg-white p-5 shadow-xl ${panelClassName}`}>
        <div className="flex items-start justify-between gap-2">
          {header}
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            aria-label="閉じる"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
