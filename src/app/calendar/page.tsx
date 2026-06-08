'use client';
import { useState, useMemo } from 'react';
import { Plus, X } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';
import { useCategories } from '@/hooks/useCategories';
import { ExpenseCalendar } from '@/components/calendar/ExpenseCalendar';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { ExpenseCard } from '@/components/expenses/ExpenseCard';
import { formatCurrency } from '@/utils/currency';
import { getCurrentMonth, formatDate, toDateString } from '@/utils/date';
import type { Expense } from '@/types';

export default function CalendarPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(toDateString(new Date()));
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>();

  const { expenses, addExpense, updateExpense, deleteExpense } = useExpenses(month);
  const { categories, getCategoryById } = useCategories();

  const selectedDateExpenses = useMemo(
    () => (selectedDate ? expenses.filter((e) => e.date === selectedDate) : []),
    [expenses, selectedDate]
  );

  const selectedTotal = useMemo(
    () => selectedDateExpenses.reduce((s, e) => s + e.amount, 0),
    [selectedDateExpenses]
  );

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
      <h1 className="text-xl font-bold text-gray-900 mb-5">カレンダー</h1>

      {/* Calendar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
        <ExpenseCalendar
          month={month}
          expenses={expenses}
          categories={categories}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onChangeMonth={setMonth}
        />
      </div>

      {/* Selected date detail */}
      {selectedDate && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
            <div>
              <p className="font-semibold text-gray-900 text-sm">{formatDate(selectedDate)}</p>
              {selectedDateExpenses.length > 0 && (
                <p className="text-xs text-gray-400">合計 {formatCurrency(selectedTotal)}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1 bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                <Plus size={13} />
                追加
              </button>
              <button
                onClick={() => setSelectedDate(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="p-3">
            {selectedDateExpenses.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-3xl mb-2">📅</p>
                <p className="text-sm text-gray-500">この日の支出はありません</p>
                <p className="text-xs text-gray-400 mt-1">「追加」ボタンで記録できます</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDateExpenses.map((expense) => (
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
        </div>
      )}

      <ExpenseForm
        isOpen={showForm}
        onClose={handleClose}
        onSubmit={handleSubmit}
        categories={categories}
        initialData={editingExpense}
        defaultDate={selectedDate ?? undefined}
      />
    </div>
  );
}
