'use client';
import { useEffect } from 'react';
import { seedDatabase } from '@/db/seed';

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    seedDatabase();
  }, []);

  return <>{children}</>;
}
