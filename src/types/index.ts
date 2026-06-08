export interface Category {
  id?: number;
  name: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Expense {
  id?: number;
  date: string; // YYYY-MM-DD
  amount: number;
  name: string;
  categoryId: number;
  memo?: string;
  paymentMethod: string;
  color?: string;
  type: 'normal' | 'fixed';
  createdAt: Date;
  updatedAt: Date;
}

export interface Budget {
  id?: number;
  month: string; // YYYY-MM
  categoryId: number;
  amount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FixedExpense {
  id?: number;
  name: string;
  amount: number;
  categoryId: number;
  paymentDay: number;
  memo?: string;
  isActive: boolean;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Settings {
  id?: number;
  currency: string;
  firstDayOfMonth: number;
  theme: string;
  createdAt: Date;
  updatedAt: Date;
}

export type PaymentMethod = '現金' | 'クレジットカード' | 'デビットカード' | '電子マネー' | 'その他';

export const PAYMENT_METHODS: PaymentMethod[] = [
  '現金',
  'クレジットカード',
  'デビットカード',
  '電子マネー',
  'その他',
];

export const COLOR_PALETTE = [
  '#FF6B6B', '#FF5252', '#FF1744', '#E53935',
  '#FF9F43', '#FF8C00', '#FFA726', '#FB8C00',
  '#FFC312', '#FECA57', '#FFD32A', '#FFB300',
  '#6AB04C', '#26de81', '#2ECC71', '#43A047',
  '#1DD1A1', '#00BCD4', '#00D2D3', '#0097A7',
  '#45AAF2', '#2E86DE', '#3498DB', '#1976D2',
  '#A29BFE', '#6C5CE7', '#5F27CD', '#7B1FA2',
  '#FD79A8', '#F368E0', '#E91E63', '#AD1457',
  '#576574', '#8395A7', '#A4B0BE', '#607D8B',
  '#10AC84', '#009688', '#4CAF50', '#8BC34A',
];
