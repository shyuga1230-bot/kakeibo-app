'use client';
import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { COLOR_PALETTE } from '@/types';
import type { Category } from '@/types';

interface ColorPickerProps {
  selected: string;
  onSelect: (color: string) => void;
}

function ColorPicker({ selected, onSelect }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLOR_PALETTE.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onSelect(color)}
          className="w-7 h-7 rounded-full transition-all hover:scale-110"
          style={{
            backgroundColor: color,
            outline: selected === color ? `3px solid ${color}` : 'none',
            outlineOffset: 2,
            boxShadow: selected === color ? `0 0 0 2px white inset` : 'none',
          }}
        />
      ))}
    </div>
  );
}

interface CategoryRowProps {
  category: Category;
  onUpdate: (id: number, data: { name: string; color: string }) => void;
  onDelete: (id: number) => void;
}

function CategoryRow({ category, onUpdate, onDelete }: CategoryRowProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [color, setColor] = useState(category.color);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSave = () => {
    if (!name.trim()) return;
    onUpdate(category.id!, { name: name.trim(), color });
    setEditing(false);
  };

  const handleCancel = () => {
    setName(category.name);
    setColor(category.color);
    setEditing(false);
  };

  return (
    <>
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">カテゴリ名</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-2 block">色を選ぶ</label>
              <ColorPicker selected={color} onSelect={setColor} />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-indigo-500 text-white text-sm font-medium"
              >
                <Check size={14} /> 保存
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium"
              >
                <X size={14} /> キャンセル
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex-shrink-0"
              style={{ backgroundColor: category.color }}
            />
            <div className="flex-1">
              <p className="font-medium text-gray-900 text-sm">{category.name}</p>
              <p className="text-xs text-gray-400">{category.color}</p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setEditing(true)}
                className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Pencil size={15} />
              </button>
              <button
                onClick={() => setShowConfirm(true)}
                className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        title="カテゴリを削除しますか？"
        message={`「${category.name}」を削除します。このカテゴリに紐づく支出データには影響しません。`}
        onConfirm={() => { onDelete(category.id!); setShowConfirm(false); }}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}

function AddCategoryForm({ onAdd }: { onAdd: (name: string, color: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_PALETTE[0]);

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), color);
    setName('');
    setColor(COLOR_PALETTE[0]);
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-indigo-300 hover:text-indigo-400 transition-colors"
      >
        <Plus size={16} />
        <span className="text-sm font-medium">カテゴリを追加</span>
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-indigo-100">
      <p className="text-sm font-semibold text-gray-900 mb-3">新しいカテゴリ</p>
      <div className="space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="カテゴリ名"
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          autoFocus
        />
        <div>
          <label className="text-xs text-gray-400 mb-2 block">色を選ぶ</label>
          <ColorPicker selected={color} onSelect={setColor} />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAdd}
            className="flex-1 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-medium"
          >
            追加
          </button>
          <button
            onClick={() => setOpen(false)}
            className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories();

  return (
    <div className="max-w-lg mx-auto px-4 pt-5 pb-4">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">カテゴリ設定</h1>
        <span className="text-xs text-gray-400 bg-white px-3 py-1.5 rounded-full border border-gray-100 shadow-sm">
          {categories.length} カテゴリ
        </span>
      </div>

      <div className="space-y-2 mb-3">
        {categories.map((cat) => (
          <CategoryRow
            key={cat.id}
            category={cat}
            onUpdate={(id, data) => updateCategory(id, data)}
            onDelete={deleteCategory}
          />
        ))}
      </div>

      <AddCategoryForm
        onAdd={(name, color) =>
          addCategory({ name, color })
        }
      />
    </div>
  );
}
