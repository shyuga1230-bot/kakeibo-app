import type { Metadata, Viewport } from "next";
import Header from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "見積もり併売データベース",
  description:
    "受注した見積もりを蓄積し、一緒に売れやすい商材の組み合わせ(併売)を分析する社内ツール",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
