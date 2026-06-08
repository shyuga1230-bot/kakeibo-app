'use client';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import type { Settings } from '@/types';

export function useSettings() {
  const settings = useLiveQuery(() => db.settings.orderBy('id').first(), []);

  const updateSettings = async (data: Partial<Omit<Settings, 'id' | 'createdAt'>>) => {
    const existing = await db.settings.orderBy('id').first();
    if (existing?.id) {
      await db.settings.update(existing.id, { ...data, updatedAt: new Date() });
    }
  };

  return { settings, updateSettings };
}
