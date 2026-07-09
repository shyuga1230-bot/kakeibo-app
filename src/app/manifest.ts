// スマホの「ホーム画面に追加」でアプリのように使えるようにするための設定。
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ark 見積・案件データベース",
    short_name: "Ark",
    description:
      "Arkの社内ツール。見積もりの蓄積と併売分析、案件(13工程)の進捗管理・振分けを行う",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
