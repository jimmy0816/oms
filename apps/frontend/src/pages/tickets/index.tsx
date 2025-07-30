import React, { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  FunnelIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ExclamationCircleIcon,
  Bars3Icon,
  BarsArrowDownIcon,
  BarsArrowUpIcon,
} from '@heroicons/react/24/outline';
import {
  TicketPriority,
  TicketStatus,
  UserRole,
  TicketWithDetails,
  SavedView,
  Permission,
} from 'shared-types';
import {
  ticketService,
  getStatusText,
  getPriorityText,
  getStatusColor,
  getPriorityColor,
} from '@/services/ticketService';
import { savedViewService } from '@/services/savedViewService';
import { locationService, Location } from '@/services/locationService'; // Import Location and locationService
import SaveViewModal from '@/components/SaveViewModal';
import ViewSelectorModal from '@/components/ViewSelectorModal';
import ManageViewsModal from '@/components/ManageViewsModal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import MultiSelectFilterModal from '@/components/MultiSelectFilterModal';

const SortIcon = ({
  field,
  sortField,
  sortOrder,
}: {
  field: string;
  sortField: string | null;
  sortOrder: 'asc' | 'desc' | null;
}) => {
  // When column is not being sorted, show both up and down arrows in gray
  if (sortField !== field) {
    return <Bars3Icon className="h3 w-3 text-gray-400" />;
  }
  // When column is sorted ascending, show black up arrow
  if (sortOrder === 'asc') {
    return <BarsArrowUpIcon className="h-3 w-3 text-black" />;
  }
  // When column is sorted descending, show black down arrow
  return <BarsArrowDownIcon className="h-3 w-3 text-black" />;
};

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalTickets, setTotalTickets] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [filters, setFilters] = useState({
    status: [] as string[],
    priority: [] as string[],
    search: '',
    locationIds: [] as string[], // Added locationIds to filters
  });
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false); // Added state for location modal
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isPriorityModalOpen, setIsPriorityModalOpen] = useState(false);
  const { user } = useAuth();
  const { showToast } = useToast();
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [allLocations, setAllLocations] = useState<Location[]>([]); // New state for all locations
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null);
  const [isFilterModified, setIsFilterModified] = useState(false);
  const [isSaveViewModalOpen, setIsSaveViewModalOpen] = useState(false);
  const [isViewSelectorModalOpen, setIsViewSelectorModalOpen] = useState(false);
  const [isManageViewsModalOpen, setIsManageViewsModalOpen] = useState(false);
  const [saveViewError, setSaveViewError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState('');
  const isInitialLoad = useRef(true);

  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  const handleSort = (field: string) => {
    const isAsc = sortField === field && sortOrder === 'asc';
    setSortOrder(isAsc ? 'desc' : 'asc');
    setSortField(field);
    setIsFilterModified(true);
    setCurrentPage(1); // Reset page to 1 when sorting changes
  };

  const handleDelete = async (ticketId: string, ticketTitle: string) => {
    if (
      window.confirm(`您確定要刪除工單「${ticketTitle}」嗎？此操作無法復原。`)
    ) {
      try {
        await ticketService.deleteTicket(ticketId);
        showToast('工單已成功刪除！', 'success');
        loadTickets();
      } catch (error) {
        console.error('刪除工單失敗:', error);
        showToast('刪除工單失敗，請稍後再試。', 'error');
      }
    }
  };

  const handleDeleteView = async (viewId: string) => {
    if (window.confirm('您確定要刪除此視圖嗎？')) {
      try {
        await savedViewService.deleteSavedView(viewId);
        showToast('視圖已成功刪除！', 'success');
        loadSavedViews();
        if (selectedViewId === viewId) {
          clearFilters();
        }
      } catch (error) {
        console.error('刪除視圖失敗:', error);
        showToast('刪除視圖失敗，請稍後再試。', 'error');
      }
    }
  };

  const handleSetDefaultView = async (viewId: string) => {
    try {
      await savedViewService.setDefaultSavedView(viewId, 'TICKET');
      showToast('預設視圖已設定！', 'success');
      await loadSavedViews(); // Reload saved views to reflect new default
    } catch (error) {
      console.error('設定預設視圖失敗:', error);
      showToast('設定預設視圖失敗，請稍後再試。', 'error');
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      const apiFilters: Record<string, any> = {}; // Changed to 'any' to allow number[]
      if (filters.status.length > 0) apiFilters.status = filters.status;
      if (filters.priority.length > 0) apiFilters.priority = filters.priority;
      if (filters.search) apiFilters.search = filters.search;
      if (filters.locationIds.length > 0)
        apiFilters.locationIds = filters.locationIds;
      if (sortField && sortOrder) {
        apiFilters.sortField = sortField;
        apiFilters.sortOrder = sortOrder;
      }

      const ticketsData = await ticketService.getAllTickets(
        currentPage,
        pageSize,
        apiFilters
      );

      const ticketsWithDetails = ticketsData.items.map((ticket) => ({
        ...ticket,
        creator: {
          id: ticket.creatorId,
          name: `${ticket.creator.name}`,
          email: `${ticket.creator.email}`,
          role: 'ADMIN' as UserRole,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        assignee: ticket.assigneeId
          ? {
              id: ticket.assigneeId,
              name: `${ticket.assignee.name}`,
              email: `${ticket.assignee.email}`,
              role: 'STAFF' as UserRole,
              createdAt: new Date(),
              updatedAt: new Date(),
            }
          : undefined,
        comments: [],
      }));

      setTickets(ticketsWithDetails);
      setTotalTickets(ticketsData.total);
    } catch (error) {
      console.error('加載工單數據時出錯:', error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    pageSize,
    filters.status,
    filters.priority,
    filters.search,
    filters.locationIds,
    sortField,
    sortOrder,
  ]);

  const loadSavedViews = useCallback(async () => {
    if (!user) return;
    try {
      const views = await savedViewService.getAllSavedViews('TICKET');
      setSavedViews(views);
    } catch (error) {
      console.error('Failed to load saved views:', error);
    }
  }, [user]);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const data = await locationService.getAllLocations();
        setAllLocations(data);
      } catch (err) {
        console.error('Failed to fetch locations:', err);
      }
    };
    fetchLocations();
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    loadSavedViews();
    setCurrentPath(window.location.pathname);
  }, [loadSavedViews]);

  const handleApplyView = useCallback(
    (viewId: string) => {
      const viewToApply = savedViews.find((view) => view.id === viewId);
      if (viewToApply) {
        const newStatus = Array.isArray(viewToApply.filters.status)
          ? viewToApply.filters.status
          : viewToApply.filters.status
          ? [viewToApply.filters.status]
          : [];
        const newPriority = Array.isArray(viewToApply.filters.priority)
          ? viewToApply.filters.priority
          : viewToApply.filters.priority
          ? [viewToApply.filters.priority]
          : [];
        const newLocationIds = Array.isArray(viewToApply.filters.locationIds)
          ? viewToApply.filters.locationIds
          : viewToApply.filters.locationIds
          ? [viewToApply.filters.locationIds]
          : [];

        setFilters({
          status: newStatus,
          priority: newPriority,
          search: viewToApply.filters.search || '',
          locationIds: newLocationIds,
        });
        setSortField(viewToApply.filters.sortField || 'createdAt');
        setSortOrder(viewToApply.filters.sortOrder || 'desc');
        setSelectedViewId(viewId);
        setCurrentPage(1);
        setIsFilterModified(false);
      }
    },
    [savedViews]
  );

  // Load default view on initial load
  useEffect(() => {
    if (isInitialLoad.current && savedViews.length > 0) {
      const defaultView = savedViews.find((view) => view.isDefault);
      if (defaultView) {
        handleApplyView(defaultView.id);
      }
      isInitialLoad.current = false;
    }
  }, [savedViews, handleApplyView]);

  const formatDate = (date: Date | string) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleFilterChange = useCallback(
    (filterName: string, selectedIds: string[]) => {
      setFilters((prev) => ({ ...prev, [filterName]: selectedIds }));
      setIsFilterModified(true);
      setCurrentPage(1);
    },
    []
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFilters((prev) => ({ ...prev, search: e.target.value }));
      setIsFilterModified(true);
    },
    []
  );

  const clearFilters = () => {
    setFilters({
      status: [],
      priority: [],
      search: '',
      locationIds: [] as string[],
    });
    setSelectedViewId(null);
    setCurrentPage(1);
    setIsFilterModified(false);
  };

  const handleSaveView = async (viewName: string) => {
    try {
      const currentFilters = {
        status: filters.status,
        priority: filters.priority,
        search: filters.search,
        locationIds: filters.locationIds as string[],
        sortField,
        sortOrder,
      };

      if (selectedViewId) {
        await savedViewService.updateSavedView(
          selectedViewId,
          viewName,
          currentFilters
        );
        showToast('視圖已成功更新！', 'success');
      } else {
        await savedViewService.createSavedView(
          viewName,
          currentFilters,
          'TICKET'
        );
        showToast('視圖已成功儲存！', 'success');
      }
      await loadSavedViews();
      setIsSaveViewModalOpen(false);
      setSaveViewError(null);
      setIsFilterModified(false);
    } catch (error: any) {
      console.error('Failed to save view:', error);
      setSaveViewError(error.message || '儲存視圖失敗');
    }
  };

  useEffect(() => {
    if (!selectedViewId) {
      const hasFilters =
        !!filters.search ||
        !!filters.status ||
        !!filters.priority ||
        filters.locationIds.length > 0;
      setIsFilterModified(hasFilters);
      return;
    }

    const currentView = savedViews.find((v) => v.id === selectedViewId);
    if (!currentView) return;

    const filtersSame =
      (currentView.filters.search || '') === filters.search &&
      (currentView.filters.status || []).sort().join(',') ===
        filters.status.sort().join(',') &&
      (currentView.filters.priority || []).sort().join(',') ===
        filters.priority.sort().join(',') &&
      (currentView.filters.locationIds || []).sort().join(',') ===
        filters.locationIds.sort().join(',');

    setIsFilterModified(!filtersSame);
  }, [filters, selectedViewId, savedViews]);

  const currentViewName = selectedViewId
    ? savedViews.find((view) => view.id === selectedViewId)?.name
    : '所有工單';

  return (
    <>
      <Head>
        <title>Tickets | OMS Prototype</title>
        <meta
          name="description"
          content="Manage tickets in the OMS Prototype"
        />
      </Head>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">工單管理</h1>
        <div className="flex items-center space-x-3">
          <button
            className="btn-outline px-4 py-2 text-sm font-medium rounded-md flex items-center space-x-1"
            onClick={clearFilters}
          >
            清除篩選
          </button>
          <Link
            href={`/tickets/new?returnUrl=${encodeURIComponent(currentPath)}`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            新增工單
          </Link>
        </div>
      </div>

      {/* Saved Views Section */}
      <div className="py-1">
        <div className="flex items-center space-x-3">
          <div
            className="relative flex items-center border border-gray-300 bg-white rounded-md shadow-sm cursor-pointer"
            onClick={() => setIsViewSelectorModalOpen(true)}
          >
            <span className="block py-2 px-3 text-sm font-medium text-gray-700 truncate max-w-[200px]">
              {currentViewName}
            </span>
            <ChevronDownIcon className="h-5 w-5 text-gray-400 mr-2" />
          </div>

          {(!selectedViewId || isFilterModified) && (
            <button
              className="btn-outline px-4 py-2 text-sm font-medium rounded-md flex items-center space-x-1"
              onClick={() => setIsSaveViewModalOpen(true)}
            >
              {selectedViewId ? '更新視圖' : '儲存視圖'}
            </button>
          )}
        </div>
      </div>

      {/* 篩選和搜尋 */}
      <div className="bg-white shadow-sm rounded-lg p-4 mb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          {/* Search Input and Button */}
          <div className="flex-grow flex items-center">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="搜尋工單..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={filters.search}
                onChange={handleSearchChange}
                onKeyPress={(e) => e.key === 'Enter' && loadTickets()} // Trigger search on Enter
              />
            </div>
            <button
              type="button"
              onClick={loadTickets} // Trigger search on button click
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-r-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 whitespace-nowrap"
            >
              <MagnifyingGlassIcon className="h-4 w-4 mr-1" />
              搜尋
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 狀態篩選 */}
          <div>
            <label
              htmlFor="status-filter"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              狀態
            </label>
            <button
              type="button"
              onClick={() => setIsStatusModalOpen(true)}
              className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-left"
            >
              {filters.status.length > 0
                ? `已選 ${filters.status.length} 個狀態`
                : '選擇狀態...'}
            </button>
          </div>

          {/* 優先級篩選 */}
          <div>
            <label
              htmlFor="priority-filter"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              優先級
            </label>
            <button
              type="button"
              onClick={() => setIsPriorityModalOpen(true)}
              className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-left"
            >
              {filters.priority.length > 0
                ? `已選 ${filters.priority.length} 個優先級`
                : '選擇優先級...'}
            </button>
          </div>

          {/* 地點篩選 */}
          <div>
            <label
              htmlFor="location-filter"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              地點
            </label>
            <button
              type="button"
              onClick={() => setIsLocationModalOpen(true)}
              className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-left"
            >
              {filters.locationIds.length > 0
                ? `已選 ${filters.locationIds.length} 個地點`
                : '選擇地點...'}
            </button>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden w-full border border-gray-200">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : totalTickets > 0 ? (
          <div>
            <div className="overflow-x-auto w-full">
              <table className="w-full divide-y divide-gray-200 table-fixed min-w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th
                      scope="col"
                      className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20"
                    >
                      ID
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer w-48"
                      onClick={() => handleSort('title')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>標題</span>
                        <SortIcon
                          field="title"
                          sortField={sortField}
                          sortOrder={sortOrder as 'asc' | 'desc'}
                        />
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer w-20"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>狀態</span>
                        <SortIcon
                          field="status"
                          sortField={sortField}
                          sortOrder={sortOrder as 'asc' | 'desc'}
                        />
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer w-20"
                      onClick={() => handleSort('priority')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>優先級</span>
                        <SortIcon
                          field="priority"
                          sortField={sortField}
                          sortOrder={sortOrder as 'asc' | 'desc'}
                        />
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer w-20"
                      onClick={() => handleSort('location')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>地點</span>
                        <SortIcon
                          field="location"
                          sortField={sortField}
                          sortOrder={sortOrder as 'asc' | 'desc'}
                        />
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer w-32"
                      onClick={() => handleSort('createdAt')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>建立時間</span>
                        <SortIcon
                          field="createdAt"
                          sortField={sortField}
                          sortOrder={sortOrder as 'asc' | 'desc'}
                        />
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer w-20"
                      onClick={() => handleSort('creator')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>建立者</span>
                        <SortIcon
                          field="creator"
                          sortField={sortField}
                          sortOrder={sortOrder as 'asc' | 'desc'}
                        />
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer w-20"
                      onClick={() => handleSort('assignee')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>負責人</span>
                        <SortIcon
                          field="assignee"
                          sortField={sortField}
                          sortOrder={sortOrder as 'asc' | 'desc'}
                        />
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20"
                    >
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() =>
                        (window.location.href = `/tickets/${ticket.id}`)
                      }
                    >
                      <td
                        className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 text-ellipsis overflow-hidden"
                        title={ticket.id}
                      >
                        #{ticket.id}
                      </td>
                      <td className="px-2 py-3 whitespace-normal">
                        <div className="text-sm font-medium text-gray-900">
                          {ticket.title}
                        </div>
                        <div className="text-sm text-gray-500">
                          {ticket.description}
                        </div>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            ticket.status
                          )}`}
                        >
                          {getStatusText(ticket.status)}
                        </span>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(
                            ticket.priority
                          )}`}
                        >
                          {getPriorityText(ticket.priority)}
                        </span>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 text-ellipsis overflow-hidden">
                        {(() => {
                          const locations = [
                            ...new Set(
                              ticket.reports
                                .map((r) => r.report.location?.name)
                                .filter(Boolean)
                            ),
                          ] as string[];

                          if (locations.length === 0) {
                            return '無';
                          }

                          const displayLocations = locations.slice(0, 2);
                          const remainingCount =
                            locations.length - displayLocations.length;

                          return (
                            <>
                              {displayLocations.map((loc) => (
                                <span
                                  key={loc}
                                  className="block text-ellipsis overflow-hidden"
                                >
                                  {loc}
                                </span>
                              ))}
                              {remainingCount > 0 && (
                                <span className="text-xs text-gray-500">
                                  ...及其他 {remainingCount} 個地點
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 text-ellipsis overflow-hidden">
                        {formatDate(ticket.createdAt)}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 text-ellipsis overflow-hidden">
                        {ticket.creator?.name || '未知'}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 text-ellipsis overflow-hidden">
                        {ticket.assignee?.name || '未指派'}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center space-x-2">
                          {user?.permissions?.includes(
                            Permission.EDIT_TICKETS
                          ) && (
                            <Link
                              href={`/tickets/${ticket.id}/edit`}
                              className="text-blue-600 hover:text-blue-900"
                              title="編輯"
                              onClick={(e) => e.stopPropagation()} // 阻止行點擊事件
                            >
                              <PencilIcon className="h-5 w-5" />
                            </Link>
                          )}
                          {user?.permissions?.includes(
                            Permission.DELETE_TICKETS
                          ) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // 阻止行點擊事件
                                handleDelete(ticket.id, ticket.title);
                              }}
                              className="text-red-600 hover:text-red-900"
                              title="刪除"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-4 p-4">
              <p className="text-sm text-gray-700">
                顯示{' '}
                <span className="font-medium">
                  {totalTickets > 0 ? (currentPage - 1) * pageSize + 1 : 0}
                </span>{' '}
                到{' '}
                <span className="font-medium">
                  {Math.min(currentPage * pageSize, totalTickets)}
                </span>{' '}
                筆，共 <span className="font-medium">{totalTickets}</span> 筆
              </p>

              <nav
                className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                aria-label="Pagination"
              >
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  <span className="sr-only">上一頁</span>
                  <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                </button>

                {Array.from({
                  length: Math.ceil(totalTickets / pageSize) || 1,
                })
                  .map((_, i) => (
                    <button
                      key={i}
                      onClick={() => handlePageChange(i + 1)}
                      className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${
                        currentPage === i + 1
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))
                  .slice(
                    Math.max(0, currentPage - 3),
                    Math.min(
                      Math.ceil(totalTickets / pageSize) || 1,
                      currentPage + 2
                    )
                  )}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= Math.ceil(totalTickets / pageSize)}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  <span className="sr-only">下一頁</span>
                  <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <FunnelIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              沒有符合條件的工單
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              請嘗試調整篩選條件或建立新工單。
            </p>
            <div className="mt-6">
              <Link href="/tickets/new" className="btn-primary">
                建立工單
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <SaveViewModal
        isOpen={isSaveViewModalOpen}
        onClose={() => setIsSaveViewModalOpen(false)}
        onSave={handleSaveView}
        errorMessage={saveViewError}
        isUpdate={!!selectedViewId}
        initialViewName={
          selectedViewId
            ? savedViews.find((v) => v.id === selectedViewId)?.name || ''
            : ''
        }
      />

      <ViewSelectorModal
        isOpen={isViewSelectorModalOpen}
        onClose={() => setIsViewSelectorModalOpen(false)}
        savedViews={savedViews}
        onApplyView={(viewId) => {
          handleApplyView(viewId);
          setIsViewSelectorModalOpen(false);
        }}
        onManageViews={() => {
          setIsManageViewsModalOpen(true);
          setIsViewSelectorModalOpen(false);
        }}
        onSaveNewView={() => {
          setSelectedViewId(null);
          setIsSaveViewModalOpen(true);
          setIsViewSelectorModalOpen(false);
        }}
        onClearView={() => {
          clearFilters();
          setIsViewSelectorModalOpen(false);
        }}
        selectedViewId={selectedViewId}
        clearViewText="清除視圖 (顯示所有工單)"
      />

      <ManageViewsModal
        isOpen={isManageViewsModalOpen}
        onClose={() => setIsManageViewsModalOpen(false)}
        savedViews={savedViews}
        onDeleteView={handleDeleteView}
        onSetDefaultView={handleSetDefaultView}
      />

      {/* Location Filter Modal */}
      <MultiSelectFilterModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onConfirm={(selectedIds) => {
          setFilters((prev) => ({
            ...prev,
            locationIds: selectedIds as string[],
          })); // Cast to string[]
          setIsLocationModalOpen(false);
          setCurrentPage(1); // Reset page when filter changes
        }}
        initialSelectedIds={filters.locationIds}
        options={allLocations.map((loc) => ({ id: loc.id, name: loc.name }))} // Pass locations as options
        title="選擇地點"
      />

      {/* Status Filter Modal */}
      <MultiSelectFilterModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onConfirm={(selectedIds) => {
          handleFilterChange('status', selectedIds as string[]);
          setIsStatusModalOpen(false);
        }}
        initialSelectedIds={filters.status}
        options={Object.values(TicketStatus).map((status) => ({
          id: status,
          name: getStatusText(status),
        }))}
        title="選擇狀態"
      />

      {/* Priority Filter Modal */}
      <MultiSelectFilterModal
        isOpen={isPriorityModalOpen}
        onClose={() => setIsPriorityModalOpen(false)}
        onConfirm={(selectedIds) => {
          handleFilterChange('priority', selectedIds as string[]);
          setIsPriorityModalOpen(false);
        }}
        initialSelectedIds={filters.priority}
        options={Object.values(TicketPriority).map((priority) => ({
          id: priority,
          name: getPriorityText(priority),
        }))}
        title="選擇優先級"
      />
    </>
  );
}
