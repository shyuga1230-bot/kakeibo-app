'use client';
import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, Power } from 'lucide-react';
import { useFixedExpenses } from '@/hooks/useFixedExpenses';
import { useCategories } from '@/hooks/useCategories';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CategoryBadge } from '@/components/ui/CategoryBadge';
import { formatCurrency } from '@/utils/currency';
import type { FixedExpense } from '@/types';

interface FixedExpenseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<FixedExpense, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  categories: ReturnType<typeof useCategories>['categories'];
  initialData?: FixedExpense;
}

function FixedExpenseForm({ isOpen, onClose, onSubmit, categories, initialData }: FixedExpenseFormProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [amount, setAmount] = useState(initialData?.amount?.toString() ?? '');
  const [categoryId, setCategoryId] = useState<number>(initialData?.categoryId ?? (categories[0]?.id ?? 0));
  const [paymentDay, setPaymentDay] = useState(initialData?.paymentDay?.toString() ?? '1');
  const [memo, setMemo] = useState(initialData?.memo ?? '');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) return setError('名前を入力してください');
    if (!amount || parseFloat(amount) <= 0) return setError('金額を入力してください');
    if (!categoryId) return setError('カテゴリを選択してください');

    setError('');
    await onSubmit({
      name: name.trim(),
      amount: parseFloat(amount),
      categoryId,
      paymentDay: parseInt(paymentDay, 10) || 1,
      memo: memo.trim() || undefined,
      isActive: initialData?.isActive ?? true,
      color: categories.find((c) => c.id === categoryId)?.color,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? '固定費を編集' : '固定費を追加'}>
      <div className="p-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">固定費名 *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：家賃、スマホ代、Netflix"
            className="w-full px-3 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">金額 *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">¥</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full pl-8 pr-3 py-3 rounded-xl border border-gray-200 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">カテゴリ *</label>
          <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryId(cat.id!)}
                className={`py-2 px-2 rounded-xl text-xs font-medium transition-all border ${
                  categoryId === cat.id ? 'border-2 shadow-sm' : 'border-gray-100'
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

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">支払日（毎月）</label>
          <select
            value={paymentDay}
            onChange={(e) => setPaymentDay(e.target.value)}
            className="w-full px-3 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>{d}日</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">メモ（任意）</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={2}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>

        {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <button
          onClick={handleSubmit}
          className="w-full py-3.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold transition-colors"
        >
          {initialData ? '更新する' : '追加する'}
        </button>
      </div>
    </Modal>
  );
}

interface FixedCardProps {
  item: FixedExpense;
  category?: ReturnType<typeof useCategories>['categories'][0];
  onEdit: (item: FixedExpense) => void;
  onDelete: (id: number) => void;
  onToggle: (id: number, active: boolean) => void;
}

function FixedCard({ item, category, onEdit, onDelete, onToggle }: FixedCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
      <div className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 ${!item.isActive ? 'opacity-50' : ''}`}>
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
            style={{ backgroundColor: `${category?.color ?? '#A4B0BE'}20` }}
          >
            <span className="text-sm">🔁</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 text-sm">{item.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {category && <CategoryBadge name={category.name} color={category.color} size="sm" />}
              <span className="text-xs text-gray-400">毎月{item.paymentDay}日</span>
            </div>
            {item.memo && <p className="text-xs text-gray-400 mt-0.5 truncate">{item.memo}</p>}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <p className="font-bold text-gray-900 text-sm">{formatCurrency(item.amount)}</p>
            <button
              onClick={() => onToggle(item.id!, !item.isActive)}
              className={`p-1.5 rounded-lg transition-colors ml-1 ${
                item.isActive ? 'text-green-500 hover:bg-green-50' : 'text-gray-300 hover:bg-gray-50'
              }`}
              title={item.isActive ? '無効にする' : '有効にする'}
            >
              <Power size={14} />
            </button>
            <button onClick={() => onEdit(item)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
              <Pencil size={14} />
            </button>
            <button onClick={() => setShowConfirm(true)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        title="固定費を削除しますか？"
        message={`「${item.name}」を削除します。`}
        onConfirm={() => { onDelete(item.id!); setShowConfirm(false); }}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}

export default function FixedPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<FixedExpense | undefined>();

  const { fixedExpenses, addFixedExpense, updateFixedExpense, deleteFixedExpense, toggleActive, activeTotal } = useFixedExpenses();
  const { categories, getCategoryById } = useCategories();

  const active = fixedExpenses.filter((f) => f.isActive);
  const inactive = fixedExpenses.filter((f) => !f.isActive);

  const handleEdit = (item: FixedExpense) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingItem(undefined);
  };

  const handleSubmit = async (data: Omit<FixedExpense, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingItem?.id) {
      await updateFixedExpense(editingItem.id, data);
    } else {
      await addFixedExpense(data);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-5 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">固定費</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-md shadow-indigo-200"
        >
          <Plus size={16} />
          追加
        </button>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-400">今月の固定費合計（有効）</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{formatCurrency(activeTotal)}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-center">
              <p className="text-xs text-gray-400">有効</p>
              <p className="text-lg font-bold text-green-500">{active.length}</p>
            </div>
            <div className="text-center ml-3">
              <p className="text-xs text-gray-400">無効</p>
              <p className="text-lg font-bold text-gray-300">{inactive.length}</p>
            </div>
          </div>
        </div>
      </div>

      {fixedExpenses.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
          <p className="text-4xl mb-3">🔁</p>
          <p className="text-sm font-medium text-gray-600">固定費がありません</p>
          <p className="text-xs text-gray-400 mt-1">家賃やサブスクなどを登録しましょう</p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Check size={14} className="text-green-500" />
                <p className="text-xs font-semibold text-gray-500">有効な固定費</p>
              </div>
              <div className="space-y-2">
                {active.map((item) => (
                  <FixedCard
                    key={item.id}
                    item={item}
                    category={getCategoryById(item.categoryId)}
                    onEdit={handleEdit}
                    onDelete={deleteFixedExpense}
                    onToggle={toggleActive}
                  />
                ))}
              </div>
            </div>
          )}

          {inactive.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Power size={14} className="text-gray-400" />
                <p className="text-xs font-semibold text-gray-400">無効な固定費</p>
              </div>
              <div className="space-y-2">
                {inactive.map((item) => (
                  <FixedCard
                    key={item.id}
                    item={item}
                    category={getCategoryById(item.categoryId)}
                    onEdit={handleEdit}
                    onDelete={deleteFixedExpense}
                    onToggle={toggleActive}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <FixedExpenseForm
        isOpen={showForm}
        onClose={handleClose}
        onSubmit={handleSubmit}
        categories={categories}
        initialData={editingItem}
      />
    </div>
  );
}
