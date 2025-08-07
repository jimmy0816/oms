import React, { useState, useEffect } from 'react';
import { XMarkIcon, ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { Category } from 'shared-types';

interface CategoryTreeFilterProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedIds: string[]) => void;
  initialSelectedIds: string[];
  categories: Category[];
  title: string;
}

const CategoryTreeFilter: React.FC<CategoryTreeFilterProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialSelectedIds,
  categories,
  title,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedIds(initialSelectedIds);
  }, [initialSelectedIds]);

  const findCategoryInTree = (id: string, cats: Category[]): Category | null => {
    for (const category of cats) {
      if (category.id === id) {
        return category;
      }
      if (category.children) {
        const found = findCategoryInTree(id, category.children);
        if (found) {
          return found;
        }
      }
    }
    return null;
  };

  const getChildrenIds = (categoryId: string): string[] => {
    const startingCategory = findCategoryInTree(categoryId, categories);

    const collectDescendantIds = (category: Category): string[] => {
      let ids: string[] = [];
      if (!category.children) {
        return ids;
      }
      for (const child of category.children) {
        ids.push(child.id);
        ids = ids.concat(collectDescendantIds(child));
      }
      return ids;
    };

    if (!startingCategory) {
      return [];
    }

    return collectDescendantIds(startingCategory);
  };

  const handleCheckboxChange = (categoryId: string) => {
    const childrenIds = getChildrenIds(categoryId);
    const allIds = [categoryId, ...childrenIds];
    const isSelected = selectedIds.includes(categoryId);

    if (isSelected) {
      setSelectedIds(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...allIds])]);
    }
  };

  const toggleExpand = (categoryId: string) => {
    setExpandedIds(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleConfirm = () => {
    onConfirm(selectedIds);
    onClose();
  };

  const handleClearAll = () => {
    setSelectedIds([]);
  };

  if (!isOpen) return null;

  const renderTree = (categoriesToRender: Category[]) => {
    return (
      <ul className="space-y-2">
        {categoriesToRender.map(category => {
          const isExpanded = expandedIds.includes(category.id);
          const isSelected = selectedIds.includes(category.id);
          const hasChildren = category.children && category.children.length > 0;
          const selectedChildrenCount = hasChildren
            ? category.children!.filter(child => selectedIds.includes(child.id)).length
            : 0;

          return (
            <li key={category.id}>
              <div className="flex items-center">
                {hasChildren ? (
                  <button onClick={() => toggleExpand(category.id)} className="p-1">
                    {isExpanded ? (
                      <ChevronDownIcon className="h-4 w-4" />
                    ) : (
                      <ChevronRightIcon className="h-4 w-4" />
                    )}
                  </button>
                ) : (
                  <div className="w-6"></div>
                )}
                <div onClick={() => handleCheckboxChange(category.id)} className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-900">{category.name}</span>
                  {selectedChildrenCount > 0 && (
                    <span className="ml-2 text-xs text-blue-500 bg-blue-100 rounded-full px-2 py-0.5">
                      {selectedChildrenCount}
                    </span>
                  )}
                </div>
              </div>
              {isExpanded && hasChildren && (
                <div className="ml-6 mt-2">
                  {renderTree(category.children!)}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
        <h2 className="text-xl font-semibold mb-4">{title}</h2>

        <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md p-4 mb-4">
          {renderTree(categories)}
        </div>

        <div className="flex justify-end space-x-3">
          <button onClick={handleClearAll} className="btn-outline">清除所有</button>
          <button onClick={onClose} className="btn-outline">取消</button>
          <button onClick={handleConfirm} className="btn-primary">確認</button>
        </div>
      </div>
    </div>
  );
};

export default CategoryTreeFilter;
