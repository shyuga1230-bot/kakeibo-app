'use client';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import type { FixedExpense } from '@/types';

export function useFixedExpenses() {
  const fixedExpenses = useLiveQuery(() => db.fixedExpenses.orderBy('id').toArray(), []);

  const addFixedExpense = async (data: Omit<FixedExpense, 'id' | 'createdAt' | 'updatedAt'>) => {
    await db.fixedExpenses.add({ ...data, createdAt: new Date(), updatedAt: new Date() });
  };

  const updateFixedExpense = async (id: number, data: Partial<Omit<FixedExpense, 'id' | 'createdAt'>>) => {
    await db.fixedExpenses.update(id, { ...data, updatedAt: new Date() });
  };

  const deleteFixedExpense = async (id: number) => {
    await db.fixedExpenses.delete(id);
  };

  const toggleActive = async (id: number, isActive: boolean) => {
    await db.fixedExpenses.update(id, { isActive, updatedAt: new Date() });
  };

  const activeTotal = (fixedExpenses ?? [])
    .filter((f) => f.isActive)
    .reduce((sum, f) => sum + f.amount, 0);

  return {
    fixedExpenses: fixedExpenses ?? [],
    addFixedExpense,
    updateFixedExpense,
    deleteFixedExpense,
    toggleActive,
    activeTotal,
  };
}
