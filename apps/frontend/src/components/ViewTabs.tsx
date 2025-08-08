import React, { useState, useRef, useEffect } from 'react';
import { SavedView } from '@/services/savedViewService';
import {
  Cog6ToothIcon,
  StarIcon as StarIconSolid,
  XMarkIcon,
} from '@heroicons/react/24/solid';
import { StarIcon as StarIconOutline } from '@heroicons/react/24/outline';

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  view: SavedView | null;
}

interface ViewTabsProps {
  views: SavedView[];
  activeViewId: string | null;
  isFilterModified: boolean;
  onSelectView: (view: SavedView | null) => void;
  onSaveView: () => void;
  onSaveAsNewView: () => void;
  onManageViews: () => void;
  onSetDefaultView: (viewId: string) => void;
  onDeleteView: (viewId: string) => void;
}

const ViewTabs: React.FC<ViewTabsProps> = ({
  views,
  activeViewId,
  isFilterModified,
  onSelectView,
  onSaveView,
  onSaveAsNewView,
  onManageViews,
  onSetDefaultView,
  onDeleteView,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, view: null });
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = (e: React.MouseEvent, view: SavedView) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, view });
  };

  const closeContextMenu = () => {
    setContextMenu({ ...contextMenu, visible: false });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      closeContextMenu();
    };
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('contextmenu', handleClickOutside, true); // Close on any context menu action

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('contextmenu', handleClickOutside, true);
    };
  }, []);

  const getDisplayName = (view: SavedView) => {
    if (activeViewId === view.id && isFilterModified) {
      return `${view.name}*`;
    }
    return view.name;
  };

  const handleDeleteClick = (e: React.MouseEvent, view: SavedView) => {
    e.stopPropagation();
    if (window.confirm(`您確定要刪除視圖 "${view.name}" 嗎？`)) {
      onDeleteView(view.id);
    }
  };

  const handleSetDefault = () => {
    if (contextMenu.view) {
      onSetDefaultView(contextMenu.view.id);
    }
    closeContextMenu();
  };

  const handleDeleteFromContext = () => {
    if (contextMenu.view) {
      onDeleteView(contextMenu.view.id);
    }
    closeContextMenu();
  };

  return (
    <>
      <div className="bg-white shadow-sm mb-4 rounded-lg p-2">
        <div className="flex items-center justify-between">
          {/* Tabs for desktop */}
          <div className="flex-grow hidden sm:flex overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {/* "All Items" Tab */}
            <div className="relative inline-block text-left">
              <div
                className={`flex items-center transition-colors duration-150 ${
                  activeViewId === null ? 'bg-blue-50' : 'hover:bg-gray-100'
                }`}
              >
                <button
                  onClick={() => onSelectView(null)}
                  className={`pl-4 pr-3 py-2 text-sm font-medium  max-w-[200px] truncate ${
                    activeViewId === null
                      ? 'border  border-b-2 border-blue-600 text-blue-700 rounded-t-md'
                      : 'text-gray-600 hover:text-gray-800 border border-dashed border-gray-300'
                  }`}
                >
                  所有項目
                </button>
              </div>
            </div>

            {views.map((view) => (
              <div 
                key={view.id} 
                className="relative inline-block text-left"
                onContextMenu={(e) => handleContextMenu(e, view)}
              >
                <div
                  className={`flex items-center transition-colors duration-150 group ${
                    activeViewId === view.id
                      ? 'border  border-b-2 border-blue-600 text-blue-700 rounded-t-md'
                      : 'hover:bg-gray-100 text-gray-600 hover:text-gray-800 border border-dashed border-gray-300 '
                  }`}
                >
                  <button
                    onClick={() => onSelectView(view)}
                    className={`pl-3 pr-2 py-2 text-sm font-medium w-[100px] truncate`}
                    title={getDisplayName(view)}
                  >
                    <div className="flex items-center">
                      {view.isDefault && (
                        <StarIconSolid className="h-4 w-4 text-yellow-500 mr-1.5 flex-shrink-0" />
                      )}
                      <span className="truncate">{getDisplayName(view)}</span>
                    </div>
                  </button>
                  <button
                    onClick={(e) => handleDeleteClick(e, view)}
                    className="p-1 rounded-full hover:bg-gray-200 transition-colors duration-150 mr-2"
                    title={`刪除視圖 "${view.name}`}
                  >
                    <XMarkIcon className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Dropdown for mobile */}
          <div className="sm:hidden w-full">
            <select
              onChange={(e) => {
                const viewId = e.target.value;
                if (viewId === 'all') {
                  onSelectView(null);
                } else {
                  const view = views.find((v) => v.id === viewId);
                  if (view) onSelectView(view);
                }
              }}
              value={activeViewId || 'all'}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="all">所有項目</option>
              {views.map((view) => (
                <option key={view.id} value={view.id}>
                  {view.isDefault ? '★ ' : ''}
                  {getDisplayName(view)}
                </option>
              ))}
            </select>
          </div>

          {/* Action buttons */}
          <div className="relative ml-auto flex-shrink-0 pl-2" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 hover:rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Cog6ToothIcon className="h-5 w-5 text-gray-600" />
            </button>

            {isMenuOpen && (
              <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                <div
                  className="py-1"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="options-menu"
                >
                  <button
                    onClick={() => {
                      onSaveView();
                      setIsMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                    disabled={!isFilterModified}
                  >
                    儲存目前視圖
                  </button>
                  <button
                    onClick={() => {
                      onSaveAsNewView();
                      setIsMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                    disabled={!isFilterModified}
                  >
                    另存為新視圖
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button
                    onClick={() => {
                      onManageViews();
                      setIsMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    管理所有視圖
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {contextMenu.visible && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50 py-1"
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
        >
          <button
            onClick={handleSetDefault}
            className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            {contextMenu.view?.isDefault 
              ? <StarIconSolid className="h-5 w-5 text-yellow-400 mr-2" /> 
              : <StarIconOutline className="h-5 w-5 text-gray-400 mr-2" />}
            設為預設
          </button>
          <button
            onClick={handleDeleteFromContext}
            className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            <XMarkIcon className="h-5 w-5 mr-2" />
            刪除視圖
          </button>
        </div>
      )}
    </>
  );
};

export default ViewTabs;