import React, { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

export interface MultiSelectOption {
  id: string | number;
  name: string;
}

interface MultiSelectFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedIds: (string | number)[]) => void;
  initialSelectedIds: (string | number)[];
  options: MultiSelectOption[];
  title: string;
}

const MultiSelectFilterModal: React.FC<MultiSelectFilterModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialSelectedIds,
  options,
  title,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>(initialSelectedIds);

  useEffect(() => {
    setSelectedIds(initialSelectedIds);
  }, [initialSelectedIds]);

  const handleCheckboxChange = (optionId: string | number) => {
    setSelectedIds((prevSelected) =>
      prevSelected.includes(optionId)
        ? prevSelected.filter((id) => id !== optionId)
        : [...prevSelected, optionId]
    );
  };

  const handleRemoveSelected = (optionId: string | number) => {
    setSelectedIds((prevSelected) =>
      prevSelected.filter((id) => id !== optionId)
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

  const filteredAndSortedOptions = options
    .filter((option) =>
      option.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const selectedFilteredOptions = filteredAndSortedOptions.filter((option) =>
    selectedIds.includes(option.id)
  );

  const unselectedFilteredOptions = filteredAndSortedOptions.filter((option) =>
    !selectedIds.includes(option.id)
  );

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

        <div className="mb-4 relative">
          <input
            type="text"
            placeholder={`搜尋${title}...`}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="mb-4 p-2 border border-blue-200 bg-blue-50 rounded-md text-sm text-blue-800">
            <p className="font-semibold mb-1">已選項目:</p>
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-1">
              {options
                .filter((opt) => selectedIds.includes(opt.id))
                .map((opt) => (
                  <span
                    key={opt.id}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-200 text-blue-900 cursor-pointer"
                    onClick={() => handleRemoveSelected(opt.id)}
                  >
                    {opt.name}
                    <XMarkIcon className="ml-1 h-3 w-3" />
                  </span>
                ))}
            </div>
          </div>
        )}

        <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md p-2 mb-4">
            {selectedFilteredOptions.length > 0 && (
              <div className="mb-2">
                <p className="text-gray-600 text-xs font-semibold mb-1">已選取</p>
                {selectedFilteredOptions.map((option) => (
                  <div key={option.id} className="flex items-center py-1">
                    <input
                      type="checkbox"
                      id={`option-${option.id}`}
                      checked={true}
                      onChange={() => handleCheckboxChange(option.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`option-${option.id}`} className="ml-2 text-sm text-gray-900 cursor-pointer">
                      {option.name}
                    </label>
                  </div>
                ))}
              </div>
            )}

            {unselectedFilteredOptions.length > 0 && (
              <div>
                {selectedFilteredOptions.length > 0 && <p className="text-gray-600 text-xs font-semibold mt-4 mb-1">未選取</p>}
                {unselectedFilteredOptions.map((option) => (
                  <div key={option.id} className="flex items-center py-1">
                    <input
                      type="checkbox"
                      id={`option-${option.id}`}
                      checked={false}
                      onChange={() => handleCheckboxChange(option.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`option-${option.id}`} className="ml-2 text-sm text-gray-900 cursor-pointer">
                      {option.name}
                    </label>
                  </div>
                ))}
              </div>
            )}

            {filteredAndSortedOptions.length === 0 && (
              <p className="text-gray-500 text-center py-4">沒有找到選項。</p>
            )}
          </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={handleClearAll}
            className="btn-outline"
          >
            清除所有
          </button>
          <button
            onClick={onClose}
            className="btn-outline"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="btn-primary"
          >
            確認
          </button>
        </div>
      </div>
    </div>
  );
};

export default MultiSelectFilterModal;
