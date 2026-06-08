'use client';
import { useState, useMemo } from 'react';
import { Plus, ChevronLeft, ChevronRight, TrendingDown, Wallet, Lock } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';
import { useCategories } from '@/hooks/useCategories';
import { useFixedExpenses } from '@/hooks/useFixedExpenses';
import { useBudgets } from '@/hooks/useBudgets';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { ExpenseCard } from '@/components/expenses/ExpenseCard';
import { CategoryPieChart } from '@/components/charts/CategoryPieChart';
import { formatCurrency } from '@/utils/currency';
import { getCurrentMonth, getPrevMonth, getNextMonth, formatMonth } from '@/utils/date';
import type { Expense } from '@/types';

export default function HomePage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>();

  const { expenses, addExpense, updateExpense, deleteExpense } = useExpenses(month);
  const { categories, getCategoryById } = useCategories();
  const { fixedExpenses, activeTotal } = useFixedExpenses();
  const { budgets } = useBudgets(month);

  const normalTotal = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );
  const totalSpent = normalTotal + activeTotal;

  const totalBudget = useMemo(
    () => budgets.reduce((sum, b) => sum + b.amount, 0),
    [budgets]
  );
  const remaining = totalBudget - totalSpent;

  const pieData = useMemo(() => {
    const byCategory: Record<number, number> = {};
    for (const e of expenses) {
      byCategory[e.categoryId] = (byCategory[e.categoryId] ?? 0) + e.amount;
    }
    for (const f of fixedExpenses.filter((f) => f.isActive)) {
      byCategory[f.categoryId] = (byCategory[f.categoryId] ?? 0) + f.amount;
    }
    return Object.entries(byCategory)
      .map(([catId, value]) => {
        const cat = getCategoryById(Number(catId));
        return { name: cat?.name ?? 'その他', value, color: cat?.color ?? '#A4B0BE' };
      })
      .sort((a, b) => b.value - a.value);
  }, [expenses, fixedExpenses, getCategoryById]);

  const topCategories = pieData.slice(0, 3);

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setShowForm(true);
  };

  const handleFormClose = () => {
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
        <div>
          <h1 className="text-xl font-bold text-gray-900">かけいぼ</h1>
          <p className="text-xs text-gray-400 mt-0.5">大学生の家計管理</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-md shadow-indigo-200"
        >
          <Plus size={16} />
          追加
        </button>
      </div>

      {/* Month selector */}
      <div className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 mb-4">
        <button onClick={() => setMonth(getPrevMonth(month))} className="p-1 text-gray-400 hover:text-gray-600">
          <ChevronLeft size={18} />
        </button>
        <span className="font-semibold text-gray-900 text-sm">{formatMonth(month)}</span>
        <button onClick={() => setMonth(getNextMonth(month))} className="p-1 text-gray-400 hover:text-gray-600">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 col-span-2">
          <p className="text-xs text-gray-400 mb-1">今月の合計支出</p>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalSpent)}</p>
          {totalBudget > 0 && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>予算 {formatCurrency(totalBudget)}</span>
                <span className={remaining >= 0 ? 'text-green-500 font-medium' : 'text-red-500 font-medium'}>
                  残り {formatCurrency(Math.abs(remaining))}{remaining < 0 ? ' 超過' : ''}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    totalSpent / totalBudget > 1
                      ? 'bg-red-400'
                      : totalSpent / totalBudget > 0.8
                      ? 'bg-amber-400'
                      : 'bg-indigo-500'
                  }`}
                  style={{ width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center">
              <Wallet size={14} className="text-indigo-500" />
            </div>
            <p className="text-xs text-gray-400">通常支出</p>
          </div>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(normalTotal)}</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-purple-50 rounded-lg flex items-center justify-center">
              <Lock size={14} className="text-purple-500" />
            </div>
            <p className="text-xs text-gray-400">固定費</p>
          </div>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(activeTotal)}</p>
        </div>
      </div>

      {/* Pie chart */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
        <h2 className="font-semibold text-gray-900 mb-1 text-sm">カテゴリ別支出</h2>
        <CategoryPieChart data={pieData} />
      </div>

      {/* Top categories */}
      {topCategories.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown size={16} className="text-gray-400" />
            <h2 className="font-semibold text-gray-900 text-sm">支出が多いカテゴリ</h2>
          </div>
          <div className="space-y-2.5">
            {topCategories.map((cat, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-sm text-gray-400 w-4 text-center">{i + 1}</span>
                <div className="flex items-center gap-2 flex-1">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-sm text-gray-700">{cat.name}</span>
                </div>
                <span className="font-semibold text-gray-900 text-sm">{formatCurrency(cat.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent expenses */}
      <div className="mb-4">
        <h2 className="font-semibold text-gray-900 text-sm mb-3">最近の支出</h2>
        {expenses.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
            <p className="text-4xl mb-3">🌱</p>
            <p className="text-sm font-medium text-gray-600">まだ支出がありません</p>
            <p className="text-xs text-gray-400 mt-1">「追加」ボタンから支出を記録しましょう</p>
          </div>
        ) : (
          <div className="space-y-2">
            {expenses.slice(0, 5).map((expense) => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                category={getCategoryById(expense.categoryId)}
                onEdit={handleEdit}
                onDelete={deleteExpense}
              />
            ))}
          </div>
        )}
      </div>

      <ExpenseForm
        isOpen={showForm}
        onClose={handleFormClose}
        onSubmit={handleSubmit}
        categories={categories}
        initialData={editingExpense}
      />
    </div>
  );
}
