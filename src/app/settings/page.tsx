'use client';
import { useState } from 'react';
import { Download, Upload, Trash2, Shield, ChevronRight } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { db } from '@/db/database';
import { seedDatabase } from '@/db/seed';

async function exportData() {
  const [expenses, categories, budgets, fixedExpenses, settings] = await Promise.all([
    db.expenses.toArray(),
    db.categories.toArray(),
    db.budgets.toArray(),
    db.fixedExpenses.toArray(),
    db.settings.toArray(),
  ]);

  const data = { expenses, categories, budgets, fixedExpenses, settings, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kakeibo-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importData(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        await db.transaction('rw', [db.expenses, db.categories, db.budgets, db.fixedExpenses, db.settings], async () => {
          if (data.categories?.length) {
            await db.categories.clear();
            await db.categories.bulkAdd(data.categories.map((c: { id?: number; name: string; color: string; createdAt: string; updatedAt: string }) => ({
              ...c, id: undefined, createdAt: new Date(c.createdAt), updatedAt: new Date(c.updatedAt)
            })));
          }
          if (data.expenses?.length) {
            await db.expenses.clear();
            await db.expenses.bulkAdd(data.expenses.map((e: { id?: number; createdAt: string; updatedAt: string; [key: string]: unknown }) => ({
              ...e, id: undefined, createdAt: new Date(e.createdAt), updatedAt: new Date(e.updatedAt)
            })));
          }
          if (data.budgets?.length) {
            await db.budgets.clear();
            await db.budgets.bulkAdd(data.budgets.map((b: { id?: number; createdAt: string; updatedAt: string; [key: string]: unknown }) => ({
              ...b, id: undefined, createdAt: new Date(b.createdAt), updatedAt: new Date(b.updatedAt)
            })));
          }
          if (data.fixedExpenses?.length) {
            await db.fixedExpenses.clear();
            await db.fixedExpenses.bulkAdd(data.fixedExpenses.map((f: { id?: number; createdAt: string; updatedAt: string; [key: string]: unknown }) => ({
              ...f, id: undefined, createdAt: new Date(f.createdAt), updatedAt: new Date(f.updatedAt)
            })));
          }
        });
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export default function SettingsPage() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleExport = async () => {
    try {
      await exportData();
      showMsg('success', 'バックアップを保存しました');
    } catch {
      showMsg('error', 'エクスポートに失敗しました');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      await importData(file);
      showMsg('success', 'データをインポートしました');
    } catch {
      showMsg('error', 'インポートに失敗しました。正しいバックアップファイルか確認してください。');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleDeleteAll = async () => {
    try {
      await db.expenses.clear();
      await db.budgets.clear();
      await db.fixedExpenses.clear();
      await seedDatabase();
      showMsg('success', 'データを削除しました');
    } catch {
      showMsg('error', 'データの削除に失敗しました');
    }
    setShowDeleteConfirm(false);
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-5 pb-4">
      <h1 className="text-xl font-bold text-gray-900 mb-5">設定</h1>

      {/* Data storage notice */}
      <div className="bg-indigo-50 rounded-2xl p-4 mb-5 flex gap-3">
        <Shield size={18} className="text-indigo-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-indigo-600 leading-relaxed">
          このアプリのデータはこのブラウザ内にのみ保存されます。サーバーへの送信は一切行いません。データはブラウザのIndexedDBに安全に保管されます。
        </p>
      </div>

      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Data management */}
      <div className="space-y-2 mb-5">
        <p className="text-xs font-semibold text-gray-400 px-1 mb-2">データ管理</p>

        <button
          onClick={handleExport}
          className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 hover:bg-gray-50 transition-colors"
        >
          <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center">
            <Download size={18} className="text-green-500" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-gray-900">データをエクスポート</p>
            <p className="text-xs text-gray-400">JSONファイルとして保存</p>
          </div>
          <ChevronRight size={16} className="text-gray-300" />
        </button>

        <label className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 hover:bg-gray-50 transition-colors cursor-pointer">
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
            <Upload size={18} className="text-blue-500" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-gray-900">
              {importing ? 'インポート中...' : 'データをインポート'}
            </p>
            <p className="text-xs text-gray-400">JSONバックアップから復元</p>
          </div>
          <ChevronRight size={16} className="text-gray-300" />
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
            disabled={importing}
          />
        </label>
      </div>

      {/* Danger zone */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-red-400 px-1 mb-2">危険な操作</p>

        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full bg-white rounded-2xl p-4 shadow-sm border border-red-100 flex items-center gap-3 hover:bg-red-50 transition-colors"
        >
          <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center">
            <Trash2 size={18} className="text-red-500" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-red-600">すべてのデータを削除</p>
            <p className="text-xs text-red-400">支出・予算データがすべて消えます</p>
          </div>
          <ChevronRight size={16} className="text-red-300" />
        </button>
      </div>

      {/* App info */}
      <div className="mt-8 text-center">
        <p className="text-sm font-bold text-gray-400">💰 かけいぼ</p>
        <p className="text-xs text-gray-300 mt-1">大学生の家計管理アプリ</p>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="すべてのデータを削除しますか？"
        message="支出・予算・固定費のデータがすべて削除されます。この操作は取り消せません。カテゴリは残ります。"
        confirmLabel="すべて削除する"
        onConfirm={handleDeleteAll}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
