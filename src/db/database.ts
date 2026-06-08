import Dexie, { type Table } from 'dexie';
import type { Expense, Category, Budget, FixedExpense, Settings } from '@/types';

class KakeiboDatabase extends Dexie {
  expenses!: Table<Expense, number>;
  categories!: Table<Category, number>;
  budgets!: Table<Budget, number>;
  fixedExpenses!: Table<FixedExpense, number>;
  settings!: Table<Settings, number>;

  constructor() {
    super('KakeiboApp');
    this.version(1).stores({
      expenses: '++id, date, categoryId, type',
      categories: '++id, name',
      budgets: '++id, month, categoryId, [month+categoryId]',
      fixedExpenses: '++id, categoryId, isActive',
      settings: '++id',
    });
  }
}

export const db = new KakeiboDatabase();
