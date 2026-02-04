import React, { useState, useMemo } from 'react';
import {
  XMarkIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  FolderIcon,
} from '@heroicons/react/24/outline';
import { Category } from 'shared-types';

interface MoveCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (targetParentId: string | null) => void;
  categories: Category[]; // All categories
  movingCategoryIds: string[]; // IDs of categories being moved (to exclude from target list)
  isMoving: boolean;
}

const MoveCategoryModal: React.FC<MoveCategoryModalProps> = ({
  isOpen,
  onClose,
  onMove,
  categories,
  movingCategoryIds,
  isMoving,
}) => {
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(
    'root',
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Filter out the moving categories and their descendants from the available targets
  const availableTargets = useMemo(() => {
    const movingSet = new Set(movingCategoryIds);

    const filterTree = (nodes: Category[]): Category[] => {
      return nodes
        .filter((node) => !movingSet.has(node.id)) // Exclude moving nodes themselves
        .map((node) => ({
          ...node,
          children: node.children ? filterTree(node.children) : [],
        }));
    };

    return filterTree(categories);
  }, [categories, movingCategoryIds]);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderTree = (nodes: Category[], level = 0) => {
    return (
      <ul
        className={`space-y-1 ${
          level > 0 ? 'ml-4 border-l border-gray-200 pl-2' : ''
        }`}
      >
        {nodes.map((node) => {
          const isExpanded = expandedIds.has(node.id);
          const hasChildren = node.children && node.children.length > 0;
          const isSelected = selectedTargetId === node.id;

          return (
            <li key={node.id}>
              <div
                className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${
                  isSelected ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                }`}
                onClick={() => setSelectedTargetId(node.id)}
              >
                <div
                  className="p-1 mr-1 rounded hover:bg-gray-200 text-gray-500"
                  onClick={(e) => hasChildren && toggleExpand(node.id, e)}
                  style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
                >
                  {isExpanded ? (
                    <ChevronDownIcon className="w-4 h-4" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4" />
                  )}
                </div>

                <FolderIcon
                  className={`w-5 h-5 mr-2 ${
                    isSelected ? 'text-blue-500' : 'text-gray-400'
                  }`}
                />
                <span className="text-sm font-medium">{node.name}</span>
              </div>
              {hasChildren &&
                isExpanded &&
                renderTree(node.children, level + 1)}
            </li>
          );
        })}
      </ul>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[80vh] m-4">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h3 className="text-lg font-medium text-gray-900">移動分類</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 p-1 rounded-md hover:bg-gray-100"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="text-sm text-gray-500 mb-4">
            將 {movingCategoryIds.length} 個選取的分類移動到...
          </div>

          <div className="border border-gray-200 rounded-md p-4">
            <div
              className={`flex items-center p-2 rounded-md cursor-pointer mb-2 ${
                selectedTargetId === 'root'
                  ? 'bg-blue-100 text-blue-700'
                  : 'hover:bg-gray-100'
              }`}
              onClick={() => setSelectedTargetId('root')}
            >
              <div className="w-6 mr-1" /> {/* Spacer for expand icon */}
              <FolderIcon
                className={`w-5 h-5 mr-2 ${
                  selectedTargetId === 'root'
                    ? 'text-blue-500'
                    : 'text-gray-400'
                }`}
              />
              <span className="text-sm font-medium">根目錄 (最上層)</span>
            </div>
            {renderTree(availableTargets)}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={isMoving}
          >
            取消
          </button>
          <button
            onClick={() =>
              onMove(selectedTargetId === 'root' ? null : selectedTargetId)
            }
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            disabled={isMoving || !selectedTargetId}
          >
            {isMoving ? '移動中...' : '確認移動'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MoveCategoryModal;
