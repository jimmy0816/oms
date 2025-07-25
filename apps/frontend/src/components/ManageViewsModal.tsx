import React from 'react';
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';
import { SavedView } from 'shared-types';

interface ManageViewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedViews: SavedView[];
  onDeleteView: (viewId: string) => void;
  onSetDefaultView: (viewId: string) => void;
}

const ManageViewsModal: React.FC<ManageViewsModalProps> = ({
  isOpen,
  onClose,
  savedViews,
  onDeleteView,
  onSetDefaultView,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-600 bg-opacity-50 flex justify-center items-center">
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">管理儲存的視圖</h3>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-500"
            onClick={onClose}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {savedViews.length === 0 ? (
            <p className="text-sm text-gray-500">沒有儲存的視圖。</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {savedViews.map((view) => (
                <li
                  key={view.id}
                  className="py-3 flex items-center justify-between"
                >
                  <span className="text-sm font-medium text-gray-700">
                    {view.name}
                    {view.isDefault && (
                      <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        預設
                      </span>
                    )}
                  </span>
                  <div className="flex items-center space-x-2">
                    {!view.isDefault && (
                      <button
                        onClick={() => onSetDefaultView(view.id)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-100 text-xs"
                        title="設為預設"
                      >
                        設為預設
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteView(view.id)}
                      className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-100"
                      title="刪除視圖"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            className="btn-outline px-4 py-2 text-sm font-medium rounded-md"
            onClick={onClose}
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageViewsModal;
