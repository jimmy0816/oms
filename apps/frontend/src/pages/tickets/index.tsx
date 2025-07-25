import React, { useState, useEffect, useCallback } from 'react';
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
} from '@heroicons/react/24/outline';
import {
  TicketPriority,
  TicketStatus,
  UserRole,
  TicketWithDetails,
  SavedView,
} from 'shared-types';
import {
  ticketService,
  getStatusText,
  getPriorityText,
  getStatusColor,
  getPriorityColor,
} from '@/services/ticketService';
import { savedViewService } from '@/services/savedViewService';
import SaveViewModal from '@/components/SaveViewModal';
import ViewSelectorModal from '@/components/ViewSelectorModal';
import ManageViewsModal from '@/components/ManageViewsModal';
import { useAuth } from '@/contexts/AuthContext';

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalTickets, setTotalTickets] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: '',
  });
  const { user } = useAuth();
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null);
  const [isFilterModified, setIsFilterModified] = useState(false);
  const [isSaveViewModalOpen, setIsSaveViewModalOpen] = useState(false);
  const [isViewSelectorModalOpen, setIsViewSelectorModalOpen] = useState(false);
  const [isManageViewsModalOpen, setIsManageViewsModalOpen] = useState(false);
  const [saveViewError, setSaveViewError] = useState<string | null>(null);

  const handleDelete = async (ticketId: string, ticketTitle: string) => {
    if (
      window.confirm(`您確定要刪除工單「${ticketTitle}」嗎？此操作無法復原。`)
    ) {
      try {
        await ticketService.deleteTicket(ticketId);
        alert('工單已成功刪除！');
        loadTickets();
      } catch (error) {
        console.error('刪除工單失敗:', error);
        alert('刪除工單失敗，請稍後再試。');
      }
    }
  };

  const handleDeleteView = async (viewId: string) => {
    if (window.confirm('您確定要刪除此視圖嗎？')) {
      try {
        await savedViewService.deleteSavedView(viewId);
        alert('視圖已成功刪除！');
        loadSavedViews();
        if (selectedViewId === viewId) {
          clearFilters();
        }
      } catch (error) {
        console.error('刪除視圖失敗:', error);
        alert('刪除視圖失敗，請稍後再試。');
      }
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      const apiFilters: Record<string, string> = {};
      if (filters.status) apiFilters.status = filters.status;
      if (filters.priority) apiFilters.priority = filters.priority;
      if (filters.search) apiFilters.search = filters.search;

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
  }, [currentPage, pageSize, filters.status, filters.priority, filters.search]);

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
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    loadSavedViews();
  }, [loadSavedViews]);

  const formatDate = (date: Date) => {
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFilters((prev) => ({ ...prev, [name]: value }));
    },
    []
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFilters((prev) => ({ ...prev, search: e.target.value }));
    },
    []
  );

  const handleApplyView = (viewId: string) => {
    const viewToApply = savedViews.find((view) => view.id === viewId);
    if (viewToApply) {
      setFilters({
        status: viewToApply.filters.status || '',
        priority: viewToApply.filters.priority || '',
        search: viewToApply.filters.search || '',
      });
      setSelectedViewId(viewId);
      setCurrentPage(1);
      setIsFilterModified(false);
    }
  };

  const clearFilters = () => {
    setFilters({ status: '', priority: '', search: '' });
    setSelectedViewId(null);
    setCurrentPage(1);
    setIsFilterModified(false);
  };

  const handleSaveView = async (viewName: string) => {
    try {
      if (selectedViewId) {
        await savedViewService.updateSavedView(selectedViewId, viewName, filters);
        alert('視圖已成功更新！');
      } else {
        await savedViewService.createSavedView(viewName, filters, 'TICKET');
        alert('視圖已成功儲存！');
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
      const hasFilters = !!filters.search || !!filters.status || !!filters.priority;
      setIsFilterModified(hasFilters);
      return;
    }

    const currentView = savedViews.find((v) => v.id === selectedViewId);
    if (!currentView) return;

    const filtersSame =
      (currentView.filters.search || '') === filters.search &&
      (currentView.filters.status || '') === filters.status &&
      (currentView.filters.priority || '') === filters.priority;

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

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">工單管理</h1>
          <Link
            href={`/tickets/new?returnUrl=${encodeURIComponent(window.location.pathname)}`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            新增工單
          </Link>
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

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
            <div className="flex-1">
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="search"
                  value={filters.search}
                  onChange={handleSearchChange}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                  placeholder="搜尋工單"
                />
              </div>
            </div>
            <div className="flex space-x-4">
              <div>
                <label htmlFor="status" className="sr-only">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="">所有狀態</option>
                  {Object.values(TicketStatus).map((status) => (
                    <option key={status} value={status}>
                      {getStatusText(status)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="priority" className="sr-only">
                  Priority
                </label>
                <select
                  id="priority"
                  name="priority"
                  value={filters.priority}
                  onChange={handleFilterChange}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="">所有優先級</option>
                  {Object.values(TicketPriority).map((priority) => (
                    <option key={priority} value={priority}>
                      {getPriorityText(priority)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Tickets List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {tickets.length > 0 ? (
                tickets.map((ticket) => (
                  <li key={ticket.id}>
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className="block hover:bg-gray-50"
                    >
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-blue-600 truncate">
                            {ticket.title}
                          </p>
                          <div className="ml-2 flex-shrink-0 flex items-center space-x-2">
                            <p
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                                ticket.status
                              )}`}
                            >
                              {getStatusText(ticket.status)}
                            </p>
                            <Link
                              href={`/tickets/${ticket.id}/edit`}
                              className="text-blue-600 hover:text-blue-900"
                              title="編輯"
                              onClick={(e) => e.stopPropagation()} // 阻止 Link 的默認行為，避免觸發父級 Link
                            >
                              <PencilIcon className="h-5 w-5" />
                            </Link>
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // 阻止按鈕的默認行為，避免觸發父級 Link
                                e.preventDefault();
                                handleDelete(ticket.id, ticket.title);
                              }}
                              className="text-red-600 hover:text-red-900"
                              title="刪除"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                        <div className="mt-2 sm:flex sm:justify-between">
                          <div className="sm:flex">
                            <p className="flex items-center text-sm text-gray-500">
                              <span className="truncate">
                                建立者: {ticket.creator.name}
                              </span>
                            </p>
                            <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                              <span className="truncate">
                                {ticket.assignee
                                  ? `負責人: ${ticket.assignee.name}`
                                  : '尚未指派'}
                              </span>
                            </p>
                          </div>
                          <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                            <p
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(
                                ticket.priority
                              )} mr-3`}
                            >
                              {getPriorityText(ticket.priority)}
                            </p>
                            <p>
                              <time dateTime={ticket.createdAt.toString()}>
                                {formatDate(ticket.createdAt)}
                              </time>
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))
              ) : (
                <li className="px-4 py-6 text-center text-gray-500">
                  沒有符合篩選條件的工單。
                </li>
              )}
            </ul>
          )}
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
      />
    </>
  );
}

