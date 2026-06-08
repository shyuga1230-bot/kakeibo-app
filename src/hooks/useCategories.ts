'use client';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import type { Category } from '@/types';

export function useCategories() {
  const categories = useLiveQuery(() => db.categories.orderBy('id').toArray(), []);

  const addCategory = async (data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
    await db.categories.add({ ...data, createdAt: new Date(), updatedAt: new Date() });
  };

  const updateCategory = async (id: number, data: Partial<Omit<Category, 'id' | 'createdAt'>>) => {
    await db.categories.update(id, { ...data, updatedAt: new Date() });
  };

  const deleteCategory = async (id: number) => {
    await db.categories.delete(id);
  };

  const getCategoryById = (id: number) => {
    return categories?.find((c) => c.id === id);
  };

  return { categories: categories ?? [], addCategory, updateCategory, deleteCategory, getCategoryById };
}
