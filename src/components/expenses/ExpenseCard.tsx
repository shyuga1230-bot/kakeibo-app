'use client';
import { useState } from 'react';
import { Trash2, Pencil, CreditCard, Wallet } from 'lucide-react';
import { CategoryBadge } from '@/components/ui/CategoryBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatCurrency } from '@/utils/currency';
import type { Expense, Category } from '@/types';

interface ExpenseCardProps {
  expense: Expense;
  category?: Category;
  onEdit: (expense: Expense) => void;
  onDelete: (id: number) => void;
}

export function ExpenseCard({ expense, category, onEdit, onDelete }: ExpenseCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const paymentIcon = expense.paymentMethod === '現金' ? (
    <Wallet size={12} />
  ) : (
    <CreditCard size={12} />
  );

  return (
    <>
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
          style={{ backgroundColor: `${category?.color ?? '#A4B0BE'}20` }}
        >
          <span className="text-base">
            {category ? getCategoryEmoji(category.name) : '💸'}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 text-sm truncate">{expense.name}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {category && <CategoryBadge name={category.name} color={category.color} size="sm" />}
            <span className="flex items-center gap-1 text-xs text-gray-400">
              {paymentIcon}
              {expense.paymentMethod}
            </span>
          </div>
          {expense.memo && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{expense.memo}</p>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <p className="font-bold text-gray-900">{formatCurrency(expense.amount)}</p>
          <button
            onClick={() => onEdit(expense)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors ml-1"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        title="支出を削除しますか？"
        message={`「${expense.name}」(${formatCurrency(expense.amount)}) を削除します。この操作は取り消せません。`}
        onConfirm={() => { onDelete(expense.id!); setShowConfirm(false); }}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}

function getCategoryEmoji(name: string): string {
  const map: Record<string, string> = {
    '食費': '🍚', 'カフェ': '☕', 'コンビニ': '🏪', '交通費': '🚃',
    '服': '👕', '美容': '💄', '学校': '🎓', '本・勉強': '📚',
    'サブスク': '📱', 'デート': '💕', '旅行': '✈️', '教会・献金': '⛪',
    '医療': '🏥', '家賃・寮費': '🏠', '通信費': '📡', '買い物': '🛍️', 'その他': '💸',
  };
  return map[name] ?? '💸';
}
