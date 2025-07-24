import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface SaveViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (viewName: string) => void;
  errorMessage?: string | null;
  isUpdate?: boolean;
  initialViewName?: string;
}

const SaveViewModal: React.FC<SaveViewModalProps> = ({
  isOpen,
  onClose,
  onSave,
  errorMessage,
  isUpdate = false,
  initialViewName = '',
}) => {
  const [viewName, setViewName] = useState(initialViewName);

  useEffect(() => {
    if (isOpen) {
      setViewName(initialViewName);
    }
  }, [isOpen, initialViewName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (viewName.trim()) {
      onSave(viewName.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
        <h2 className="text-xl font-semibold mb-4">
          {isUpdate ? '更新視圖' : '儲存目前篩選為視圖'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="viewName" className="block text-sm font-medium text-gray-700 mb-1">
              視圖名稱
            </label>
            <input
              type="text"
              id="viewName"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              required
            />
          </div>

          {errorMessage && (
            <p className="text-red-500 text-sm mb-4">{errorMessage}</p>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-outline"
            >
              取消
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              {isUpdate ? '更新' : '儲存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SaveViewModal;
