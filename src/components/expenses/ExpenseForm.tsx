'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Calculator as CalcIcon, RefreshCw, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Calculator } from '@/components/calculator/Calculator';
import type { Expense, Category } from '@/types';
import { PAYMENT_METHODS } from '@/types';
import { getCurrentDate } from '@/utils/date';

interface ExpenseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  categories: Category[];
  initialData?: Expense;
  defaultDate?: string;
}

export function ExpenseForm({
  isOpen,
  onClose,
  onSubmit,
  categories,
  initialData,
  defaultDate,
}: ExpenseFormProps) {
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [date, setDate] = useState(getCurrentDate());
  const [paymentMethod, setPaymentMethod] = useState('現金');
  const [memo, setMemo] = useState('');
  const [showCalc, setShowCalc] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // 連続入力モードはフォームを開くたびにリセットしない（ユーザーの設定を保持）
  const [continuousMode, setContinuousMode] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setAmount(initialData.amount.toString());
        setName(initialData.name);
        setCategoryId(initialData.categoryId);
        setDate(initialData.date);
        setPaymentMethod(initialData.paymentMethod);
        setMemo(initialData.memo ?? '');
      } else {
        setAmount('');
        setName('');
        setCategoryId(categories[0]?.id ?? null);
        setDate(defaultDate ?? getCurrentDate());
        setPaymentMethod('現金');
        setMemo('');
      }
      setError('');
      setShowCalc(false);
    }
  }, [isOpen, initialData, defaultDate, categories]);

  const handleSubmit = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('金額を入力してください');
      return;
    }
    if (!name.trim()) {
      setError('支出名を入力してください');
      return;
    }
    if (!categoryId) {
      setError('カテゴリを選択してください');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onSubmit({
        amount: parseFloat(amount),
        name: name.trim(),
        categoryId,
        date,
        paymentMethod,
        memo: memo.trim() || undefined,
        type: 'normal',
        color: categories.find((c) => c.id === categoryId)?.color,
      });

      if (continuousMode) {
        setAmount('');
        setName('');
        setMemo('');
        setError('');
        setTimeout(() => nameInputRef.current?.focus(), 80);
      } else {
        onClose();
      }
    } catch {
      setError('保存できませんでした');
    } finally {
      setLoading(false);
    }
  }, [amount, name, categoryId, date, paymentMethod, memo, continuousMode, categories, onSubmit, onClose]);

  const handleEnterKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  if (showCalc) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="電卓">
        <Calculator
          onUseAmount={(val) => {
            setAmount(val.toString());
            setShowCalc(false);
            setTimeout(() => amountInputRef.current?.focus(), 80);
          }}
        />
        <div className="px-4 pb-4">
          <button
            onClick={() => setShowCalc(false)}
            className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm"
          >
            戻る
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? '支出を編集' : '支出を追加'}
      size="md"
    >
      <div className="p-5 space-y-4">
        {/* 連続入力モード toggle */}
        {!initialData && (
          <button
            type="button"
            onClick={() => setContinuousMode((v) => !v)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-colors ${
              continuousMode
                ? 'border-indigo-200 bg-indigo-50'
                : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <RefreshCw size={14} className={continuousMode ? 'text-indigo-500' : 'text-gray-400'} />
              <span className={`text-xs font-medium ${continuousMode ? 'text-indigo-600' : 'text-gray-500'}`}>
                連続入力モード
              </span>
              {continuousMode && (
                <span className="text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded-full">ON</span>
              )}
            </div>
            <div
              className={`w-10 h-5 rounded-full transition-colors relative ${
                continuousMode ? 'bg-indigo-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  continuousMode ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </div>
          </button>
        )}

        {/* 金額 */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">金額 *</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">¥</span>
              <input
                ref={amountInputRef}
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={handleEnterKey}
                placeholder="0"
                className="w-full pl-8 pr-3 py-3 rounded-xl border border-gray-200 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowCalc(true)}
              className="px-3 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors"
            >
              <CalcIcon size={20} />
            </button>
          </div>
        </div>

        {/* 支出名 */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">支出名 *</label>
          <input
            ref={nameInputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleEnterKey}
            placeholder="例：学食、コーヒー、バス代"
            className="w-full px-3 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
          />
        </div>

        {/* カテゴリ */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">カテゴリ *</label>
          <div className="grid grid-cols-3 gap-1.5 max-h-40 overflow-y-auto">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryId(cat.id!)}
                className={`py-2 px-2 rounded-xl text-xs font-medium transition-all border ${
                  categoryId === cat.id
                    ? 'border-2 shadow-sm'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
                style={
                  categoryId === cat.id
                    ? { borderColor: cat.color, backgroundColor: `${cat.color}18`, color: cat.color }
                    : { backgroundColor: `${cat.color}10`, color: cat.color }
                }
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* 日付 */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">日付 *</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
          />
        </div>

        {/* 支払い方法 */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">支払い方法</label>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPaymentMethod(m)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  paymentMethod === m
                    ? 'bg-indigo-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* メモ */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">メモ（任意）</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            onKeyDown={handleEnterKey}
            placeholder="メモを入力..."
            rows={2}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
          />
          {!initialData && (
            <p className="text-[10px] text-gray-400 mt-1">Enter で追加 / Shift+Enter で改行</p>
          )}
        </div>

        {error && (
          <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg flex items-center gap-2">
            <AlertCircle size={14} />
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white font-semibold transition-colors"
        >
          {loading ? '保存中...' : initialData ? '更新する' : continuousMode ? '追加して続ける' : '追加する'}
        </button>
      </div>
    </Modal>
  );
}
