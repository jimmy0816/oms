import React, { useState, useEffect, useMemo } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { Location } from 'shared-types';
import { useToast } from '@/contexts/ToastContext';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon, // Keep TrashIcon for potential future use or within edit modal
  ChevronUpIcon, // Not used with drag-and-drop, but kept for reference if needed
  ChevronDownIcon, // Not used with drag-and-drop, but kept for reference if needed
  MagnifyingGlassIcon, // For search
} from '@heroicons/react/24/outline';

import locationService from '@/services/locationService';

// --- LocationModal Component (Custom) ---
interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (location: Partial<Location>) => void;
  initialData?: Location | null;
  isSaving: boolean;
}

const LocationModal: React.FC<LocationModalProps> = ({ isOpen, onClose, onSave, initialData, isSaving }) => {
  const [name, setName] = useState('');
  const [externalId, setExternalId] = useState<string | number>('');
  const [active, setActive] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) { // Only reset when modal opens
      setName(initialData?.name || '');
      setExternalId(initialData?.externalId?.toString() || '');
      setActive(initialData?.active ?? true);
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('空間名稱不能為空', 'error');
      return;
    }
    onSave({
      name: name.trim(),
      externalId: externalId ? Number(externalId) : undefined,
      active,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="relative p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
          {initialData ? '編輯空間' : '新增空間'}
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="location-name" className="block text-sm font-medium text-gray-700 mb-1">空間名稱</label>
            <input
              type="text"
              id="location-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="external-id" className="block text-sm font-medium text-gray-700 mb-1">外部 ID (可選)</label>
            <input
              type="number"
              id="external-id"
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          {initialData && ( // Only show active switch when editing
            <div className="mb-4 flex items-center">
              <input
                type="checkbox"
                id="active-status"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              <label htmlFor="active-status" className="ml-2 block text-sm text-gray-900">
                啟用狀態
              </label>
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={isSaving}>
              取消
            </button>
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? '儲存中...' : '儲存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- LocationItem Component (Presentational for list item) ---
interface LocationItemProps {
  location: Location;
  index: number; // For display purposes, not for sorting logic
  renderContext: { // Context passed from parent for actions and drag/drop state
    draggedId: string | null;
    dropTarget: { id: string, position: 'before' | 'after' } | null;
    handleDragStart: (e: React.DragEvent<HTMLLIElement>, loc: Location) => void;
    handleDragOver: (e: React.DragEvent<HTMLLIElement>, loc: Location) => void;
    handleDragLeave: (e: React.DragEvent<HTMLLIElement>) => void;
    handleDrop: (e: React.DragEvent<HTMLLIElement>, loc: Location) => void;
    onEdit: (loc: Location) => void;
    onToggleActive: (id: string, newActiveStatus: boolean) => void;
    isSearchActive: boolean;
  };
}

const LocationItem: React.FC<LocationItemProps> = ({ location, index, renderContext }) => {
  const {
    draggedId,
    dropTarget,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    onEdit,
    onToggleActive,
    isSearchActive,
  } = renderContext;

  const isDropTarget = dropTarget?.id === location.id;
  const isDragged = draggedId === location.id;

  const getDropClassName = () => {
    if (!isDropTarget) return '';
    return dropTarget?.position === 'before' ? 'border-t-2 border-blue-500' : 'border-b-2 border-blue-500';
  };

  return (
    <li
      key={location.id}
      className={`p-3 my-1 bg-white rounded-md shadow-sm transition-all flex items-center justify-between ${getDropClassName()} ${isDragged ? 'opacity-50' : ''}`}
      draggable={!isSearchActive} // Only draggable when no search is active
      onDragStart={(e) => handleDragStart(e, location)}
      onDragOver={(e) => handleDragOver(e, location)}
      onDragLeave={(e) => handleDragLeave(e)} // Pass event object
      onDrop={(e) => handleDrop(e, location)}
    >
      <div className="flex-grow flex items-center space-x-4">
        <div className="flex-shrink-0 w-6 text-center text-gray-500 text-sm">
          {index + 1}.
        </div>
        <div className="flex-grow">
          <div className="font-medium text-gray-900">{location.name}</div>
          <div className="text-sm text-gray-500">外部 ID: {location.externalId || '-'}</div>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <button
          onClick={() => onToggleActive(location.id, !location.active)}
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            location.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
          title={location.active ? '點擊關閉' : '點擊啟用'}
        >
          {location.active ? '啟用中' : '已關閉'}
        </button>
        <button onClick={() => onEdit(location)} className="text-blue-500 hover:text-blue-700" title="編輯">
          <PencilIcon className="h-5 w-5" />
        </button>
      </div>
    </li>
  );
};

// --- LocationManagementPage Component (Container) ---
const LocationManagementPage: NextPage = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // For modal saving state
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { showToast } = useToast();

  // --- Drag and Drop State ---
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string, position: 'before' | 'after' } | null>(null);

  // --- Data Fetching ---
  const fetchLocations = async () => {
    setLoading(true);
    try {
      const data = await locationService.getAllLocations();
      setLocations(data);
    } catch (error) {
      showToast('載入空間列表失敗', 'error');
      console.error('Failed to fetch locations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  // --- Filtering Logic ---
  const filteredLocations = useMemo(() => {
    if (!searchQuery) {
      return locations;
    }
    const lowerCaseQuery = searchQuery.toLowerCase();
    return locations.filter(loc =>
      loc.name.toLowerCase().includes(lowerCaseQuery) ||
      loc.externalId?.toString().toLowerCase().includes(lowerCaseQuery)
    );
  }, [locations, searchQuery]);

  // --- Modal Handlers ---
  const handleOpenModalForCreate = () => {
    setEditingLocation(null);
    setIsModalOpen(true);
  };

  const handleOpenModalForEdit = (location: Location) => {
    setEditingLocation(location);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingLocation(null);
  };

  const handleSaveLocation = async (values: Partial<Location>) => {
    setIsSaving(true);
    try {
      if (editingLocation) {
        await locationService.updateLocation(editingLocation.id, values);
        showToast('空間更新成功', 'success');
      } else {
        await locationService.createLocation(values as { name: string; externalId?: number; active?: boolean });
        showToast('空間新增成功', 'success');
      }
      handleCloseModal();
      await fetchLocations(); // Re-fetch to update the list
    } catch (error: any) {
      showToast(error.message || '操作失敗', 'error');
      console.error('Failed to save location:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Active Status Toggle ---
  const handleToggleActive = async (id: string, newActiveStatus: boolean) => {
    try {
      await locationService.updateLocation(id, { active: newActiveStatus });
      showToast(`空間已${newActiveStatus ? '啟用' : '關閉'}`, 'success');
      // Optimistically update UI or re-fetch
      setLocations(prev => prev.map(loc => loc.id === id ? { ...loc, active: newActiveStatus } : loc));
    } catch (error: any) {
      showToast(error.message || '更新啟用狀態失敗', 'error');
      console.error('Failed to toggle active status:', error);
      fetchLocations(); // Re-fetch to revert if optimistic update fails
    }
  };

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, location: Location) => {
    if (searchQuery) { // Disable drag if search is active
      e.preventDefault();
      return;
    }
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', location.id);
    setDraggedId(location.id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLIElement>, targetLocation: Location) => {
    if (searchQuery) { // Disable drag if search is active
      e.preventDefault();
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    if (!draggedId || draggedId === targetLocation.id) return;

    const draggedItem = locations.find(loc => loc.id === draggedId);
    if (!draggedItem) return;

    // Only allow reordering within the currently displayed (filtered) list
    // This check ensures we don't try to reorder items that are not visible
    const currentFilteredIds = filteredLocations.map(loc => loc.id);
    if (!currentFilteredIds.includes(draggedId) || !currentFilteredIds.includes(targetLocation.id)) {
      setDropTarget(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const verticalMidpoint = rect.top + rect.height / 2;

    if (e.clientY < verticalMidpoint) {
      setDropTarget({ id: targetLocation.id, position: 'before' });
    } else {
      setDropTarget({ id: targetLocation.id, position: 'after' });
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault();
    setDropTarget(null);
  };

  const handleDrop = async (e: React.DragEvent<HTMLLIElement>, targetLocation: Location) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedId || !dropTarget || searchQuery) { // Disable drop if search is active
      setDraggedId(null);
      setDropTarget(null);
      return;
    }

    const draggedItem = locations.find(loc => loc.id === draggedId);
    if (!draggedItem) {
      setDraggedId(null);
      setDropTarget(null);
      return;
    }

    // Perform reordering on the full 'locations' array, not just filtered
    const currentLocations = [...locations];
    const draggedIndex = currentLocations.findIndex(loc => loc.id === draggedId);
    const [removed] = currentLocations.splice(draggedIndex, 1);

    // Find the target index in the full array
    const targetIndex = currentLocations.findIndex(loc => loc.id === dropTarget.id);
    if (dropTarget.position === 'before') {
      currentLocations.splice(targetIndex, 0, removed);
    } else {
      currentLocations.splice(targetIndex + 1, 0, removed);
    }

    // Assign new sortOrder values based on array index
    const updates = currentLocations.map((loc, index) => ({
      id: loc.id,
      sortOrder: index,
    }));

    setDraggedId(null);
    setDropTarget(null);

    try {
      await locationService.reorderLocations(updates);
      showToast('空間順序已更新', 'success');
      await fetchLocations(); // Re-fetch to ensure consistency and correct sortOrder
    } catch (error) {
      showToast('順序更新失敗', 'error');
      console.error(error);
    }
  };

  // --- Render Context for LocationItem ---
  const renderContext = {
    draggedId,
    dropTarget,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    onEdit: handleOpenModalForEdit,
    onToggleActive: handleToggleActive,
    isSearchActive: !!searchQuery,
  };

  return (
    <>
      <Head>
        <title>空間管理 | OMS Prototype</title>
        <meta name="description" content="管理系統中的空間" />
      </Head>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">空間管理</h1>
        <button
          type="button"
          onClick={handleOpenModalForCreate}
          className="btn-primary px-4 py-2 text-sm font-medium rounded-md flex items-center"
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          <span>新增空間</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="mb-4">
        <label htmlFor="search-location" className="sr-only">搜尋空間</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            id="search-location"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="搜尋空間名稱或外部 ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredLocations.length > 0 ? (
          <ul className="space-y-2">
            {filteredLocations.map((location, index) => (
              <LocationItem
                key={location.id}
                location={location}
                index={index}
                renderContext={renderContext}
              />
            ))}
          </ul>
        ) : (
          <div className="text-center py-12">
            <PlusIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              沒有空間
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              點擊按鈕新增一個空間，或調整搜尋條件。
            </p>
            <div className="mt-6">
              <button onClick={handleOpenModalForCreate} className="btn-primary">
                新增空間
              </button>
            </div>
          </div>
        )}
      </div>

      <LocationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveLocation}
        initialData={editingLocation}
        isSaving={isSaving}
      />
    </>
  );
};

export default LocationManagementPage;