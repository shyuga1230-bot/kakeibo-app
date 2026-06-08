import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, getDay, addMonths, subMonths } from 'date-fns';
import { ja } from 'date-fns/locale';

export function toDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function toMonthString(date: Date): string {
  return format(date, 'yyyy-MM');
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return format(date, 'M月d日(E)', { locale: ja });
}

export function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  return `${year}年${parseInt(month)}月`;
}

export function getCurrentMonth(): string {
  return toMonthString(new Date());
}

export function getCurrentDate(): string {
  return toDateString(new Date());
}

export function getCalendarDays(monthStr: string): Date[] {
  const [year, month] = monthStr.split('-').map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month - 1, endOfMonth(firstDay).getDate());
  return eachDayOfInterval({ start: firstDay, end: lastDay });
}

export function getFirstDayOfWeek(monthStr: string): number {
  const [year, month] = monthStr.split('-').map(Number);
  const firstDay = new Date(year, month - 1, 1);
  return getDay(firstDay);
}

export function getPrevMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number);
  const date = subMonths(new Date(year, month - 1, 1), 1);
  return toMonthString(date);
}

export function getNextMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number);
  const date = addMonths(new Date(year, month - 1, 1), 1);
  return toMonthString(date);
}

export function isCurrentMonth(monthStr: string): boolean {
  return monthStr === getCurrentMonth();
}

export const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土'];
