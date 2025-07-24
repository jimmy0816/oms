import React, { useState } from 'react';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { SavedView } from 'shared-types';

interface ViewSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedViews: SavedView[];
  onApplyView: (viewId: string) => void;
  onManageViews: () => void;
  onSaveNewView: () => void;
  onClearView: () => void;
  selectedViewId: string | null;
  clearViewText?: string;
}

const ViewSelectorModal: React.FC<ViewSelectorModalProps> = ({
  isOpen,
  onClose,
  savedViews,
  onApplyView,
  onManageViews,
  onSaveNewView,
  onClearView,
  selectedViewId,
  clearViewText = '清除視圖 (顯示所有通報)',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-600 bg-opacity-50 flex justify-center items-center">
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">選擇或管理視圖</h3>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-500"
            onClick={onClose}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="mb-4">
          <button
            onClick={() => {
              onSaveNewView();
              onClose();
            }}
            className="btn-primary w-full flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            儲存當前篩選為新視圖
          </button>
        </div>

        <ul className="divide-y divide-gray-200 max-h-60 overflow-y-auto border border-gray-200 rounded-md mb-4"> {/* Added mb-4 for spacing */}
          <li className="flex items-center justify-between py-2 px-3 hover:bg-gray-50">
            <button
              onClick={() => {
                onClearView();
                onClose();
              }}
              className={`flex-grow text-left text-sm font-medium ${!selectedViewId ? 'text-blue-600' : 'text-gray-700'}`}
            >
              {clearViewText}
            </button>
          </li>
          {savedViews.length === 0 ? (
            <li className="py-2 px-3 text-sm text-gray-500 text-center">沒有儲存的視圖。</li>
          ) : (
            savedViews.map((view) => (
              <li key={view.id} className="flex items-center justify-between py-2 px-3 hover:bg-gray-50">
                <button
                  onClick={() => {
                    onApplyView(view.id);
                    onClose();
                  }}
                  className={`flex-grow text-left text-sm font-medium ${selectedViewId === view.id ? 'text-blue-600' : 'text-gray-700'}`}
                >
                  {view.name}
                </button>
              </li>
            ))
          )}
        </ul>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            className="btn-outline px-4 py-2 text-sm font-medium rounded-md"
            onClick={() => {
              onManageViews();
              onClose();
            }}
          >
            管理視圖
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewSelectorModal;
