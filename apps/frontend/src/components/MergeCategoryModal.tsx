import React, { useState, useMemo, useEffect } from 'react';
import { Category } from 'shared-types';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface MergeCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMerge: (
    sourceIds: string[],
    targetId: string | undefined,
    newName: string | undefined,
  ) => Promise<void>;
  categories: Category[];
  selectedIds: Set<string>;
  isMerging: boolean;
}

export default function MergeCategoryModal({
  isOpen,
  onClose,
  onMerge,
  categories,
  selectedIds,
  isMerging,
}: MergeCategoryModalProps) {
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [targetId, setTargetId] = useState<string>('');
  const [newName, setNewName] = useState<string>('');

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setMode('existing');
      setTargetId('');
      setNewName('');
    }
  }, [isOpen]);

  const flatCategories = useMemo(() => {
    const flatten = (cats: Category[]): Category[] => {
      return cats.reduce<Category[]>((acc, cat) => {
        acc.push(cat);
        if (cat.children) {
          acc.push(...flatten(cat.children));
        }
        return acc;
      }, []);
    };
    return flatten(categories);
  }, [categories]);

  // Available targets: Only Level 3 categories.
  const availableTargets = useMemo(() => {
    return flatCategories.filter((c) => c.level === 3);
  }, [flatCategories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Logic to determine actual sourceIds and targetId
    let finalSourceIds = Array.from(selectedIds);
    let finalTargetId: string | undefined = undefined;
    let finalNewName: string | undefined = undefined;

    if (mode === 'existing') {
      if (!targetId) return;
      finalTargetId = targetId;
      // detailed logic: remove targetId from sourceIds if present
      finalSourceIds = finalSourceIds.filter((id) => id !== targetId);
    } else {
      if (!newName) return;
      finalNewName = newName;
    }

    if (finalSourceIds.length === 0) {
      alert(
        '無效的操作：沒有要整併的來源分類 (可能是因為您選擇了唯一的選取項目作為目標)',
      );
      return;
    }

    onMerge(finalSourceIds, finalTargetId, finalNewName);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md m-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h3 className="text-lg font-medium text-gray-900">整併分類</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 p-1 rounded-md hover:bg-gray-100"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          <div className="mb-4 text-sm text-gray-500">
            <p>您已選取 {selectedIds.size} 個分類。</p>
            <p className="mt-2 text-yellow-800 bg-yellow-50 p-2 rounded border border-yellow-200">
              注意：整併後，來源分類將被封存（標記為
              Merged），其關聯的通報與子分類將轉移至目標分類。
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex space-x-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  value="existing"
                  checked={mode === 'existing'}
                  onChange={() => setMode('existing')}
                  className="mr-2 text-blue-600 focus:ring-blue-500"
                />
                整併至現有分類
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  value="new"
                  checked={mode === 'new'}
                  onChange={() => setMode('new')}
                  className="mr-2 text-blue-600 focus:ring-blue-500"
                />
                整併至新分類
              </label>
            </div>

            {mode === 'existing' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  選擇目標分類
                </label>
                <select
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  required
                >
                  <option value="">請選擇...</option>
                  {availableTargets.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} {selectedIds.has(cat.id) ? '(選取項目)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  新分類名稱
                </label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="輸入新分類名稱"
                  required
                />
              </div>
            )}

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                onClick={onClose}
                disabled={isMerging}
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isMerging}
              >
                {isMerging ? '處理中...' : '確認整併'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
