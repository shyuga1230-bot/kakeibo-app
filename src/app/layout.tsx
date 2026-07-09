import type { Metadata, Viewport } from "next";
import Header from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ark 見積・案件データベース",
  description:
    "Arkの社内ツール。見積もりの蓄積と併売分析、案件(13工程)の進捗管理・振分けを行う",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-5xl px-4 py-5 pb-16">{children}</main>
      </body>
    </html>
  );
}
