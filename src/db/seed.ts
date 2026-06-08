import { db } from './database';
import type { Category } from '@/types';

const initialCategories: Omit<Category, 'id'>[] = [
  { name: '食費', color: '#FF6B6B', createdAt: new Date(), updatedAt: new Date() },
  { name: 'カフェ', color: '#FECA57', createdAt: new Date(), updatedAt: new Date() },
  { name: 'コンビニ', color: '#45AAF2', createdAt: new Date(), updatedAt: new Date() },
  { name: '交通費', color: '#26de81', createdAt: new Date(), updatedAt: new Date() },
  { name: '服', color: '#FF9F43', createdAt: new Date(), updatedAt: new Date() },
  { name: '美容', color: '#F368E0', createdAt: new Date(), updatedAt: new Date() },
  { name: '学校', color: '#5F27CD', createdAt: new Date(), updatedAt: new Date() },
  { name: '本・勉強', color: '#00D2D3', createdAt: new Date(), updatedAt: new Date() },
  { name: 'サブスク', color: '#A29BFE', createdAt: new Date(), updatedAt: new Date() },
  { name: 'デート', color: '#FD79A8', createdAt: new Date(), updatedAt: new Date() },
  { name: '旅行', color: '#1DD1A1', createdAt: new Date(), updatedAt: new Date() },
  { name: '教会・献金', color: '#8395A7', createdAt: new Date(), updatedAt: new Date() },
  { name: '医療', color: '#EE5A24', createdAt: new Date(), updatedAt: new Date() },
  { name: '家賃・寮費', color: '#2E86DE', createdAt: new Date(), updatedAt: new Date() },
  { name: '通信費', color: '#10AC84', createdAt: new Date(), updatedAt: new Date() },
  { name: '買い物', color: '#FFC312', createdAt: new Date(), updatedAt: new Date() },
  { name: 'その他', color: '#A4B0BE', createdAt: new Date(), updatedAt: new Date() },
];

export async function seedDatabase() {
  try {
    const categoryCount = await db.categories.count();
    if (categoryCount === 0) {
      await db.categories.bulkAdd(initialCategories);
    }

    const settingsCount = await db.settings.count();
    if (settingsCount === 0) {
      await db.settings.add({
        currency: 'JPY',
        firstDayOfMonth: 1,
        theme: 'light',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  } catch (err) {
    console.error('DB seed error:', err);
  }
}
