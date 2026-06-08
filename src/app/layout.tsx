import type { Metadata, Viewport } from 'next';
import './globals.css';
import { BottomNavigation } from '@/components/layout/Navigation';
import { DatabaseProvider } from '@/components/providers/DatabaseProvider';
import { SwRegistration } from '@/components/providers/SwRegistration';

export const metadata: Metadata = {
  title: 'かけいぼ | 大学生の家計管理',
  description: '大学生のためのシンプルな家計管理アプリ',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'かけいぼ',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#4F46E5',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full bg-[#F8F9FF]">
        <SwRegistration />
        <DatabaseProvider>
          <div className="md:flex md:h-screen">
            <BottomNavigation />
            <main className="flex-1 md:overflow-y-auto pb-20 md:pb-0">
              {children}
            </main>
          </div>
        </DatabaseProvider>
      </body>
    </html>
  );
}
