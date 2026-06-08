'use client';
import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Pencil, Check, X, AlertTriangle, TrendingUp } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';
import { useCategories } from '@/hooks/useCategories';
import { useFixedExpenses } from '@/hooks/useFixedExpenses';
import { useBudgets } from '@/hooks/useBudgets';
import { CategoryBadge } from '@/components/ui/CategoryBadge';
import { formatCurrency } from '@/utils/currency';
import { getCurrentMonth, getPrevMonth, getNextMonth, formatMonth } from '@/utils/date';
import type { Category } from '@/types';

interface BudgetRowProps {
  category: Category;
  spent: number;
  budget: number;
  onSave: (amount: number) => void;
}

function BudgetRow({ category, spent, budget, onSave }: BudgetRowProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(budget > 0 ? budget.toString() : '');

  const ratio = budget > 0 ? spent / budget : 0;
  const remaining = budget - spent;
  const isOver = ratio > 1;
  const isWarn = ratio > 0.8 && !isOver;

  const handleSave = () => {
    const amt = parseInt(value, 10);
    if (!isNaN(amt) && amt >= 0) {
      onSave(amt);
    }
    setEditing(false);
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <CategoryBadge name={category.name} color={category.color} />
        <div className="flex items-center gap-1">
          {isOver && <span className="text-xs text-red-500 font-medium flex items-center gap-1"><AlertTriangle size={11} />超過</span>}
          {isWarn && <span className="text-xs text-amber-500 font-medium flex items-center gap-1"><TrendingUp size={11} />注意</span>}
          <button
            onClick={() => { setEditing(!editing); setValue(budget > 0 ? budget.toString() : ''); }}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 ml-1"
          >
            <Pencil size={13} />
          </button>
        </div>
      </div>

      {editing ? (
        <div className="flex items-center gap-2 mt-2">
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">¥</span>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="予算を入力"
              className="w-full pl-7 pr-2 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
            />
          </div>
          <button onClick={handleSave} className="p-2 rounded-xl bg-indigo-500 text-white"><Check size={14} /></button>
          <button onClick={() => setEditing(false)} className="p-2 rounded-xl bg-gray-100 text-gray-500"><X size={14} /></button>
        </div>
      ) : (
        <>
          <div className="flex items-end justify-between mt-1">
            <div>
              <p className="text-sm text-gray-500">
                使用済み <span className="font-semibold text-gray-800">{formatCurrency(spent)}</span>
              </p>
              {budget > 0 && (
                <p className={`text-xs mt-0.5 ${isOver ? 'text-red-500' : isWarn ? 'text-amber-500' : 'text-gray-400'}`}>
                  残り {isOver ? '-' : ''}{formatCurrency(Math.abs(remaining))}
                </p>
              )}
            </div>
            <div className="text-right">
              {budget > 0 ? (
                <p className="text-sm text-gray-400">予算 {formatCurrency(budget)}</p>
              ) : (
                <p className="text-xs text-gray-300">予算未設定</p>
              )}
            </div>
          </div>

          {budget > 0 && (
            <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isOver ? 'bg-red-400' : isWarn ? 'bg-amber-400' : 'bg-indigo-400'
                }`}
                style={{ width: `${Math.min(ratio * 100, 100)}%` }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function BudgetPage() {
  const [month, setMonth] = useState(getCurrentMonth());

  const { expenses } = useExpenses(month);
  const { categories } = useCategories();
  const { fixedExpenses, activeTotal } = useFixedExpenses();
  const { budgets, setBudget } = useBudgets(month);

  const spentByCategory = useMemo(() => {
    const map: Record<number, number> = {};
    for (const e of expenses) {
      map[e.categoryId] = (map[e.categoryId] ?? 0) + e.amount;
    }
    for (const f of fixedExpenses.filter((f) => f.isActive)) {
      map[f.categoryId] = (map[f.categoryId] ?? 0) + f.amount;
    }
    return map;
  }, [expenses, fixedExpenses]);

  const totalBudget = useMemo(() => budgets.reduce((s, b) => s + b.amount, 0), [budgets]);
  const totalSpent = useMemo(
    () => expenses.reduce((s, e) => s + e.amount, 0) + activeTotal,
    [expenses, activeTotal]
  );

  const getBudgetForCat = (catId: number) =>
    budgets.find((b) => b.categoryId === catId)?.amount ?? 0;

  return (
    <div className="max-w-lg mx-auto px-4 pt-5 pb-4">
      <h1 className="text-xl font-bold text-gray-900 mb-5">予算管理</h1>

      {/* Month selector */}
      <div className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 mb-4">
        <button onClick={() => setMonth(getPrevMonth(month))} className="p-1 text-gray-400">
          <ChevronLeft size={18} />
        </button>
        <span className="font-semibold text-gray-900 text-sm">{formatMonth(month)}</span>
        <button onClick={() => setMonth(getNextMonth(month))} className="p-1 text-gray-400">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Overall summary */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
        <div className="grid grid-cols-3 divide-x divide-gray-100 text-center">
          <div className="px-2">
            <p className="text-xs text-gray-400 mb-1">今月の予算</p>
            <p className="font-bold text-gray-900 text-base">{formatCurrency(totalBudget)}</p>
          </div>
          <div className="px-2">
            <p className="text-xs text-gray-400 mb-1">使用済み</p>
            <p className="font-bold text-gray-900 text-base">{formatCurrency(totalSpent)}</p>
          </div>
          <div className="px-2">
            <p className="text-xs text-gray-400 mb-1">残り予算</p>
            <p className={`font-bold text-base ${totalBudget - totalSpent < 0 ? 'text-red-500' : 'text-green-500'}`}>
              {totalBudget > 0 ? formatCurrency(Math.abs(totalBudget - totalSpent)) : '—'}
            </p>
          </div>
        </div>
        {totalBudget > 0 && (
          <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                totalSpent / totalBudget > 1 ? 'bg-red-400' :
                totalSpent / totalBudget > 0.8 ? 'bg-amber-400' : 'bg-indigo-500'
              }`}
              style={{ width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Per-category budget */}
      <div className="space-y-2">
        <p className="text-xs text-gray-400 px-1 mb-2">
          カテゴリ名横の鉛筆アイコンをタップして予算を設定できます
        </p>
        {categories.map((cat) => (
          <BudgetRow
            key={cat.id}
            category={cat}
            spent={spentByCategory[cat.id!] ?? 0}
            budget={getBudgetForCat(cat.id!)}
            onSave={(amount) => setBudget(month, cat.id!, amount)}
          />
        ))}
      </div>
    </div>
  );
}
