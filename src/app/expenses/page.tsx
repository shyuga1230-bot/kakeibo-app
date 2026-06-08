'use client';
import { useState, useMemo } from 'react';
import { Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';
import { useCategories } from '@/hooks/useCategories';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { ExpenseCard } from '@/components/expenses/ExpenseCard';
import { formatCurrency } from '@/utils/currency';
import { getCurrentMonth, getPrevMonth, getNextMonth, formatMonth, formatDate } from '@/utils/date';
import type { Expense } from '@/types';

export default function ExpensesPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>();

  const { expenses, addExpense, updateExpense, deleteExpense } = useExpenses(month);
  const { categories, getCategoryById } = useCategories();

  const filtered = useMemo(() => {
    if (!search) return expenses;
    const q = search.toLowerCase();
    return expenses.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        getCategoryById(e.categoryId)?.name.toLowerCase().includes(q) ||
        (e.memo ?? '').toLowerCase().includes(q)
    );
  }, [expenses, search, getCategoryById]);

  const grouped = useMemo(() => {
    const map: Record<string, Expense[]> = {};
    for (const e of filtered) {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    }
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  const total = useMemo(() => filtered.reduce((s, e) => s + e.amount, 0), [filtered]);

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingExpense(undefined);
  };

  const handleSubmit = async (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingExpense?.id) {
      await updateExpense(editingExpense.id, data);
    } else {
      await addExpense(data);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-5 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">支出一覧</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-md shadow-indigo-200"
        >
          <Plus size={16} />
          追加
        </button>
      </div>

      {/* Month selector */}
      <div className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 mb-3">
        <button onClick={() => setMonth(getPrevMonth(month))} className="p-1 text-gray-400 hover:text-gray-600">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <span className="font-semibold text-gray-900 text-sm">{formatMonth(month)}</span>
          <span className="block text-xs text-gray-400">合計 {formatCurrency(total)}</span>
        </div>
        <button onClick={() => setMonth(getNextMonth(month))} className="p-1 text-gray-400 hover:text-gray-600">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="支出名・カテゴリで検索"
          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-gray-100 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>

      {/* Expense list grouped by date */}
      {grouped.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm font-medium text-gray-600">
            {search ? '検索結果が見つかりません' : 'この月の支出はありません'}
          </p>
          {!search && (
            <p className="text-xs text-gray-400 mt-1">「追加」ボタンから支出を記録しましょう</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([date, dayExpenses]) => {
            const dayTotal = dayExpenses.reduce((s, e) => s + e.amount, 0);
            return (
              <div key={date}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500">{formatDate(date)}</span>
                  <span className="text-xs font-semibold text-gray-500">{formatCurrency(dayTotal)}</span>
                </div>
                <div className="space-y-2">
                  {dayExpenses.map((expense) => (
                    <ExpenseCard
                      key={expense.id}
                      expense={expense}
                      category={getCategoryById(expense.categoryId)}
                      onEdit={handleEdit}
                      onDelete={deleteExpense}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ExpenseForm
        isOpen={showForm}
        onClose={handleClose}
        onSubmit={handleSubmit}
        categories={categories}
        initialData={editingExpense}
      />
    </div>
  );
}
