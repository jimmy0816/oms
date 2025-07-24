import React, { useState, useEffect } from 'react';
import { locationService, Location } from '@/services/locationService';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface LocationFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedIds: number[]) => void;
  initialSelectedLocationIds: number[];
}

const LocationFilterModal: React.FC<LocationFilterModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialSelectedLocationIds,
}) => {
  const [allLocations, setAllLocations] = useState<Location[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocations, setSelectedLocations] = useState<number[]>(initialSelectedLocationIds);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchLocations = async () => {
      try {
        setLoading(true);
        const data = await locationService.getAllLocations();
        setAllLocations(data);
      } catch (err) {
        console.error('Failed to fetch locations:', err);
        setError('無法載入地點清單。');
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, [isOpen]);

  useEffect(() => {
    setSelectedLocations(initialSelectedLocationIds);
  }, [initialSelectedLocationIds]);

  const handleCheckboxChange = (locationId: number) => {
    setSelectedLocations((prevSelected) =>
      prevSelected.includes(locationId)
        ? prevSelected.filter((id) => id !== locationId)
        : [...prevSelected, locationId]
    );
  };

  const handleRemoveSelected = (locationId: number) => {
    setSelectedLocations((prevSelected) =>
      prevSelected.filter((id) => id !== locationId)
    );
  };

  const handleConfirm = () => {
    onConfirm(selectedLocations);
    onClose();
  };

  const handleClearAll = () => {
    setSelectedLocations([]);
  };

  if (!isOpen) return null;

  const filteredAndSortedLocations = allLocations
    .filter((location) =>
      location.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const selectedFilteredLocations = filteredAndSortedLocations.filter((location) =>
    selectedLocations.includes(location.id)
  );

  const unselectedFilteredLocations = filteredAndSortedLocations.filter((location) =>
    !selectedLocations.includes(location.id)
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
        <h2 className="text-xl font-semibold mb-4">選擇地點</h2>

        <div className="mb-4 relative">
          <input
            type="text"
            placeholder="搜尋地點..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
        </div>

        {selectedLocations.length > 0 && (
          <div className="mb-4 p-2 border border-blue-200 bg-blue-50 rounded-md text-sm text-blue-800">
            <p className="font-semibold mb-1">已選地點:</p>
            <div className="flex flex-wrap gap-2">
              {allLocations
                .filter((loc) => selectedLocations.includes(loc.id))
                .map((loc) => (
                  <span
                    key={loc.id}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-200 text-blue-900 cursor-pointer"
                    onClick={() => handleRemoveSelected(loc.id)}
                  >
                    {loc.name}
                    <XMarkIcon className="ml-1 h-3 w-3" />
                  </span>
                ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="text-center text-red-500">{error}</div>
        ) : (
          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md p-2 mb-4">
            {selectedFilteredLocations.length > 0 && (
              <div className="mb-2">
                <p className="text-gray-600 text-xs font-semibold mb-1">已選取</p>
                {selectedFilteredLocations.map((location) => (
                  <div key={location.id} className="flex items-center py-1">
                    <input
                      type="checkbox"
                      id={`location-${location.id}`}
                      checked={true}
                      onChange={() => handleCheckboxChange(location.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`location-${location.id}`} className="ml-2 text-sm text-gray-900 cursor-pointer">
                      {location.name}
                    </label>
                  </div>
                ))}
              </div>
            )}

            {unselectedFilteredLocations.length > 0 && (
              <div>
                {selectedFilteredLocations.length > 0 && <p className="text-gray-600 text-xs font-semibold mt-4 mb-1">未選取</p>}
                {unselectedFilteredLocations.map((location) => (
                  <div key={location.id} className="flex items-center py-1">
                    <input
                      type="checkbox"
                      id={`location-${location.id}`}
                      checked={false}
                      onChange={() => handleCheckboxChange(location.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`location-${location.id}`} className="ml-2 text-sm text-gray-900 cursor-pointer">
                      {location.name}
                    </label>
                  </div>
                ))}
              </div>
            )}

            {filteredAndSortedLocations.length === 0 && (
              <p className="text-gray-500 text-center py-4">沒有找到地點。</p>
            )}
          </div>
        )}

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

export default LocationFilterModal;
