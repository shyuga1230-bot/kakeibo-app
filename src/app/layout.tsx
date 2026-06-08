import type { Metadata } from 'next';
import './globals.css';
import { BottomNavigation } from '@/components/layout/Navigation';
import { DatabaseProvider } from '@/components/providers/DatabaseProvider';

export const metadata: Metadata = {
  title: 'かけいぼ | 大学生の家計管理',
  description: 'シンプルで使いやすい大学生向け家計管理アプリ',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full bg-[#F8F9FF]">
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
