// Arkのロゴマーク(ネイビーの角丸タイルにアンバーの「A」)。
// ヘッダーとログイン画面で使う。サーバー・クライアントどちらからでも使える。

type Props = {
  /** 表示サイズ(px)。ヘッダーは32、ログイン画面は56など */
  size?: number;
};

export default function ArkLogo({ size = 32 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="Arkのロゴ"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="ark-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1e40af" />
          <stop offset="55%" stopColor="#172554" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
        <linearGradient id="ark-a" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="45%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#ark-tile)" />
      <rect
        x="0.5"
        y="0.5"
        width="31"
        height="31"
        rx="7.5"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.12"
      />
      {/* 「A」= 起工から積み上がる山のかたち */}
      <path d="M16 5.5 L26.5 26.5 H21.8 L16 14.2 L10.2 26.5 H5.5 Z" fill="url(#ark-a)" />
      <rect x="12.4" y="20.4" width="7.2" height="2.6" rx="1.3" fill="url(#ark-a)" />
    </svg>
  );
}
