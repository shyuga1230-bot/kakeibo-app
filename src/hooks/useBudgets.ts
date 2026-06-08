'use client';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import type { Budget } from '@/types';

export function useBudgets(month: string) {
  const budgets = useLiveQuery(
    () => db.budgets.filter((b) => b.month === month).toArray(),
    [month]
  );

  const setBudget = async (month: string, categoryId: number, amount: number) => {
    const existing = await db.budgets.where({ month, categoryId }).first();
    if (existing?.id) {
      await db.budgets.update(existing.id, { amount, updatedAt: new Date() });
    } else {
      await db.budgets.add({ month, categoryId, amount, createdAt: new Date(), updatedAt: new Date() });
    }
  };

  const deleteBudget = async (id: number) => {
    await db.budgets.delete(id);
  };

  const getBudgetForCategory = (categoryId: number): number => {
    return budgets?.find((b) => b.categoryId === categoryId)?.amount ?? 0;
  };

  return { budgets: budgets ?? [], setBudget, deleteBudget, getBudgetForCategory };
}
