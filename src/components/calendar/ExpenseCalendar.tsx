'use client';
import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/utils/currency';
import { getCalendarDays, getFirstDayOfWeek, getPrevMonth, getNextMonth, formatMonth, WEEKDAYS_JA, toDateString } from '@/utils/date';
import type { Expense, Category } from '@/types';

interface ExpenseCalendarProps {
  month: string;
  expenses: Expense[];
  categories: Category[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onChangeMonth: (month: string) => void;
}

export function ExpenseCalendar({
  month,
  expenses,
  categories,
  selectedDate,
  onSelectDate,
  onChangeMonth,
}: ExpenseCalendarProps) {
  const days = useMemo(() => getCalendarDays(month), [month]);
  const firstDayOfWeek = useMemo(() => getFirstDayOfWeek(month), [month]);

  const dailyTotals = useMemo(() => {
    const map: Record<string, { total: number; colors: string[] }> = {};
    for (const e of expenses) {
      if (!map[e.date]) map[e.date] = { total: 0, colors: [] };
      map[e.date].total += e.amount;
      const color = categories.find((c) => c.id === e.categoryId)?.color;
      if (color && !map[e.date].colors.includes(color)) {
        map[e.date].colors.push(color);
      }
    }
    return map;
  }, [expenses, categories]);

  const maxDaily = useMemo(() => {
    const totals = Object.values(dailyTotals).map((d) => d.total);
    return totals.length > 0 ? Math.max(...totals) : 0;
  }, [dailyTotals]);

  const today = toDateString(new Date());

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => onChangeMonth(getPrevMonth(month))}
          className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="font-semibold text-gray-900">{formatMonth(month)}</h2>
        <button
          onClick={() => onChangeMonth(getNextMonth(month))}
          className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS_JA.map((d, i) => (
          <div
            key={d}
            className={`text-center text-xs font-medium py-1 ${
              i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map((day) => {
          const dateStr = toDateString(day);
          const dayNum = day.getDate();
          const dow = day.getDay();
          const data = dailyTotals[dateStr];
          const isSelected = selectedDate === dateStr;
          const isToday = dateStr === today;
          const intensity = data && maxDaily > 0 ? data.total / maxDaily : 0;

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={`relative flex flex-col items-center py-1.5 rounded-xl transition-all ${
                isSelected
                  ? 'bg-indigo-500 text-white shadow-md'
                  : isToday
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'hover:bg-gray-50'
              }`}
            >
              <span
                className={`text-xs font-medium ${
                  isSelected
                    ? 'text-white'
                    : dow === 0
                    ? 'text-red-400'
                    : dow === 6
                    ? 'text-blue-400'
                    : 'text-gray-700'
                }`}
              >
                {dayNum}
              </span>

              {data ? (
                <>
                  <div
                    className={`w-full px-0.5 mt-0.5 rounded text-center ${isSelected ? 'opacity-90' : ''}`}
                    style={{
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : `rgba(99,102,241,${0.08 + intensity * 0.2})`,
                    }}
                  >
                    <span className={`text-[9px] font-semibold leading-tight block ${isSelected ? 'text-white' : 'text-indigo-600'}`}>
                      {data.total >= 10000
                        ? `${Math.floor(data.total / 1000)}k`
                        : formatCurrency(data.total).replace('¥', '')}
                    </span>
                  </div>
                  <div className="flex gap-0.5 mt-0.5 justify-center flex-wrap">
                    {data.colors.slice(0, 3).map((color, i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
