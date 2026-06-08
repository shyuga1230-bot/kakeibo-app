'use client';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import type { Expense } from '@/types';

export function useExpenses(month?: string) {
  const expenses = useLiveQuery(
    async () => {
      if (month) {
        const all = await db.expenses.toArray();
        return all
          .filter((e) => e.date.startsWith(month))
          .sort((a, b) => b.date.localeCompare(a.date));
      }
      const all = await db.expenses.toArray();
      return all.sort((a, b) => b.date.localeCompare(a.date));
    },
    [month]
  );

  const addExpense = async (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    await db.expenses.add({ ...data, createdAt: new Date(), updatedAt: new Date() });
  };

  const updateExpense = async (id: number, data: Partial<Omit<Expense, 'id' | 'createdAt'>>) => {
    await db.expenses.update(id, { ...data, updatedAt: new Date() });
  };

  const deleteExpense = async (id: number) => {
    await db.expenses.delete(id);
  };

  return { expenses: expenses ?? [], addExpense, updateExpense, deleteExpense };
}

export function useExpensesByDate(date: string) {
  const expenses = useLiveQuery(
    () => db.expenses.filter((e) => e.date === date).toArray(),
    [date]
  );
  return expenses ?? [];
}
