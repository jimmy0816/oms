import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  ArrowDownTrayIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Bars3Icon,
  BarsArrowDownIcon,
  BarsArrowUpIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import {
  TicketPriority,
  TicketStatus,
  TicketWithDetails,
  SavedView,
  Permission,
  User,
  Location,
  Role,
} from 'shared-types';
import { userService } from '@/services/userService';
import {
  ticketService,
  getStatusText,
  getPriorityText,
  getStatusColor,
  getPriorityColor,
} from '@/services/ticketService';
import { roleService, getRoleName } from '@/services/roleService';
import { savedViewService } from '@/services/savedViewService';
import { locationService } from '@/services/locationService';
import SaveViewModal from '@/components/SaveViewModal';
import ViewTabs from '@/components/ViewTabs';
import ManageViewsModal from '@/components/ManageViewsModal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import MultiSelectFilterModal from '@/components/MultiSelectFilterModal';
import PermissionGuard from '@/components/PermissionGuard';
import TooltipCell from '@/components/TooltipCell';
import DatePicker from 'react-datepicker';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { ParsedUrlQuery } from 'querystring';

// Helper to parse array from query
const getQueryArray = (query: ParsedUrlQuery, key: string): string[] => {
  const value = query[key];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return [value];
  return [];
};

const SortIcon = ({
  field,
  sortField,
  sortOrder,
}: {
  field: string;
  sortField: string | null;
  sortOrder: 'asc' | 'desc' | null;
}) => {
  if (sortField !== field) {
    return <Bars3Icon className="h-3 w-3 text-gray-400" />;
  }
  if (sortOrder === 'asc') {
    return <BarsArrowUpIcon className="h-3 w-3 text-black" />;
  }
  return <BarsArrowDownIcon className="h-3 w-3 text-black" />;
};

export default function TicketsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  // --- STATE DERIVED FROM URL ---
  const {
    page,
    search,
    status,
    priority,
    locationIds,
    roleIds,
    creatorIds,
    assigneeIds,
    dateRange,
    sortField,
    sortOrder,
    selectedViewId,
  } = useMemo(() => {
    const query = router.query;
    const startDate = query.startDate ? new Date(query.startDate as string) : null;
    const endDate = query.endDate ? new Date(query.endDate as string) : null;
    return {
      page: parseInt(query.page as string, 10) || 1,
      search: (query.search as string) || '',
      status: getQueryArray(query, 'status'),
      priority: getQueryArray(query, 'priority'),
      locationIds: getQueryArray(query, 'locationIds'),
      roleIds: getQueryArray(query, 'roleIds'),
      creatorIds: getQueryArray(query, 'creatorIds'),
      assigneeIds: getQueryArray(query, 'assigneeIds'),
      dateRange: [startDate, endDate] as [Date | null, Date | null],
      sortField: (query.sortField as string) || 'createdAt',
      sortOrder: (query.sortOrder as 'asc' | 'desc') || 'desc',
      selectedViewId: (query.view as string) || null,
    };
  }, [router.query]);

  // --- LOCAL UI STATE ---
  const [tickets, setTickets] = useState<TicketWithDetails[]>([]);
  const [totalTickets, setTotalTickets] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [isSaveViewModalOpen, setIsSaveViewModalOpen] = useState(false);
  const [isManageViewsModalOpen, setIsManageViewsModalOpen] = useState(false);
  const [saveViewError, setSaveViewError] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState(search);

  // --- MODAL STATES ---
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isPriorityModalOpen, setIsPriorityModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isCreatorModalOpen, setIsCreatorModalOpen] = useState(false);
  const [isAssigneeModalOpen, setIsAssigneeModalOpen] = useState(false);

  // --- STATIC DATA FETCHED ONCE ---
  const [allLocations, setAllLocations] = useState<Location[]>([]);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);

  // Function to update URL query parameters
  const updateQuery = useCallback(
    (newQuery: Partial<Record<string, any>>) => {
      const query = { ...router.query, ...newQuery };

      if (Object.keys(newQuery).some((k) => k !== 'page')) {
        query.page = '1';
      }

      Object.keys(query).forEach((key) => {
        if (
          query[key] === null ||
          query[key] === undefined ||
          query[key] === '' ||
          (Array.isArray(query[key]) && (query[key] as string[]).length === 0)
        ) {
          delete query[key];
        }
      });

      router.push({ pathname: '/tickets', query }, undefined, { shallow: true });
    },
    [router]
  );

  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchStaticData = async () => {
      try {
        const [locations, roles, users] = await Promise.all([
          locationService.getActiveLocations(),
          roleService.getAllRoles(),
          userService.getAllUsers(),
        ]);
        setAllLocations(locations);
        setAllRoles(roles);
        setAllUsers(users);
      } catch (err) {
        console.error('Failed to fetch static data:', err);
        showToast('無法載入篩選選項，請重試', 'error');
      }
    };
    fetchStaticData();
  }, [showToast]);

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
    loadSavedViews();
  }, [loadSavedViews]);

  useEffect(() => {
    if (!router.isReady) return;

    const fetchTickets = async () => {
      setLoading(true);
      setError(null);
      try {
        const pageSize = 20;
        const apiFilters = {
          search, status, priority, locationIds, roleIds, creatorIds, assigneeIds,
          startDate: dateRange[0] ? format(dateRange[0], 'yyyy-MM-dd') : undefined,
          endDate: dateRange[1] ? format(dateRange[1], 'yyyy-MM-dd') : undefined,
          sortField, sortOrder,
        };
        const response = await ticketService.getAllTickets(page, pageSize, apiFilters);
        setTickets(response.items);
        setTotalTickets(response.total);
      } catch (e) {
        console.error('Error loading tickets:', e);
        setError('加載工單數據失敗，請稍後重試');
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [router.isReady, page, search, status, priority, locationIds, roleIds, creatorIds, assigneeIds, dateRange, sortField, sortOrder]);

  useEffect(() => {
    if (router.isReady && savedViews.length > 0 && Object.keys(router.query).length === 0) {
      const defaultView = savedViews.find((v) => v.isDefault);
      if (defaultView) {
        handleApplyView(defaultView.id);
      }
    }
  }, [router.isReady, savedViews]);

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  // --- EVENT HANDLERS ---
  const handleSort = (field: string) => {
    const isAsc = sortField === field && sortOrder === 'asc';
    updateQuery({ sortField: field, sortOrder: isAsc ? 'desc' : 'asc' });
  };

  const clearFilters = () => {
    setLocalSearch('');
    updateQuery({
      search: undefined, status: undefined, priority: undefined, locationIds: undefined,
      roleIds: undefined, creatorIds: undefined, assigneeIds: undefined,
      startDate: undefined, endDate: undefined, sortField: undefined, sortOrder: undefined,
      view: undefined, page: undefined,
    });
  };

  const handleApplyView = useCallback((viewId: string) => {
    const view = savedViews.find((v) => v.id === viewId);
    if (!view) return;

    const { filters } = view;
    const startDate = filters.dateRange?.[0] ? format(new Date(filters.dateRange[0]), 'yyyy-MM-dd') : undefined;
    const endDate = filters.dateRange?.[1] ? format(new Date(filters.dateRange[1]), 'yyyy-MM-dd') : undefined;

    updateQuery({
      search: filters.search || undefined,
      status: filters.status || undefined,
      priority: filters.priority || undefined,
      locationIds: filters.locationIds || undefined,
      roleIds: filters.roleIds || undefined,
      creatorIds: filters.creatorIds || undefined,
      assigneeIds: filters.assigneeIds || undefined,
      sortField: filters.sortField || undefined,
      sortOrder: filters.sortOrder || undefined,
      startDate, endDate, view: viewId, page: 1,
    });
  }, [savedViews, updateQuery]);

  const handleSaveView = async (viewName: string) => {
    try {
      const currentFilters = {
        search, status, priority, locationIds, roleIds, creatorIds, assigneeIds,
        dateRange, sortField, sortOrder,
      };

      let savedView: SavedView;
      if (selectedViewId) {
        savedView = await savedViewService.updateSavedView(selectedViewId, viewName, currentFilters);
        showToast('視圖已成功更新！', 'success');
      } else {
        savedView = await savedViewService.createSavedView(viewName, currentFilters, 'TICKET');
        showToast('視圖已成功儲存！', 'success');
      }
      
      await loadSavedViews();
      updateQuery({ view: savedView.id });
      setIsSaveViewModalOpen(false);
      setSaveViewError(null);
    } catch (error: any) {
      console.error('Failed to save view:', error);
      setSaveViewError(error.message || '儲存視圖失敗');
    }
  };

  const handleDeleteView = async (viewId: string) => {
    if (window.confirm('您確定要刪除此視圖嗎？')) {
      try {
        await savedViewService.deleteSavedView(viewId);
        showToast('視圖已成功刪除！', 'success');
        await loadSavedViews();
        if (selectedViewId === viewId) clearFilters();
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
      await loadSavedViews();
    } catch (error) {
      console.error('設定預設視圖失敗:', error);
      showToast('設定預設視圖失敗，請稍後再試。', 'error');
    }
  };

  const handleDeleteTicket = async (ticketId: string, ticketTitle: string) => {
    if (window.confirm(`您確定要刪除工單「${ticketTitle}」嗎？此操作無法復原。`)) {
      try {
        await ticketService.deleteTicket(ticketId);
        showToast('工單已成功刪除！', 'success');
        updateQuery({ timestamp: Date.now() });
      } catch (error) {
        console.error('刪除工單失敗:', error);
        showToast('刪除工單失敗，請稍後再試。', 'error');
      }
    }
  };

  const handleExport = async () => {
    try {
      const apiFilters = {
        status, priority, search, locationIds, roleIds, creatorIds, assigneeIds,
        startDate: dateRange[0] ? format(dateRange[0], 'yyyy-MM-dd') : undefined,
        endDate: dateRange[1] ? format(dateRange[1], 'yyyy-MM-dd') : undefined,
        sortField, sortOrder,
      };
      const blob = await ticketService.exportTickets(apiFilters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tickets.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('工單已成功匯出！', 'success');
    } catch (error) {
      console.error('匯出工單失敗:', error);
      showToast('匯出工單失敗，請稍後再試。', 'error');
    }
  };

  // --- DERIVED UI STATE ---
  const isFilterModified = useMemo(() => {
    if (!selectedViewId) return false;
    const activeView = savedViews.find((v) => v.id === selectedViewId);
    if (!activeView) return false;

    const createCanonicalString = (filters: any) => {
      const cleaned: Record<string, any> = {};
      const allKeys = ['search', 'status', 'priority', 'locationIds', 'roleIds', 'creatorIds', 'assigneeIds', 'sortField', 'sortOrder', 'dateRange'];
      allKeys.forEach((key) => {
        const value = filters[key];
        if (value === null || value === undefined) return;
        if (Array.isArray(value)) {
          if (value.length > 0) {
            if (key === 'dateRange') {
              const [start, end] = value;
              const normalizedRange = [start ? format(new Date(start), 'yyyy-MM-dd') : null, end ? format(new Date(end), 'yyyy-MM-dd') : null];
              if (normalizedRange[0] || normalizedRange[1]) cleaned[key] = normalizedRange;
            } else {
              cleaned[key] = [...value].sort();
            }
          }
        } else if (typeof value === 'string') {
          if (value !== '') cleaned[key] = value;
        } else {
          cleaned[key] = value;
        }
      });
      return JSON.stringify(cleaned);
    };

    const viewFiltersString = createCanonicalString(activeView.filters);
    const currentFiltersString = createCanonicalString({ search, status, priority, locationIds, roleIds, creatorIds, assigneeIds, dateRange, sortField, sortOrder });

    return viewFiltersString !== currentFiltersString;
  }, [selectedViewId, savedViews, search, status, priority, locationIds, roleIds, creatorIds, assigneeIds, dateRange, sortField, sortOrder]);

  const allAssignees = useMemo(() => [{ id: 'UNASSIGNED', name: '未指派' } as User, ...allUsers], [allUsers]);

  // --- RENDER LOGIC ---
  useEffect(() => {
    const checkSize = () => setIsFilterVisible(window.innerWidth >= 768);
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  const formatDate = (date: Date | string) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const truncateString = (str: string, num: number) => {
    if (str.length > num) return str.slice(0, num) + '...';
    return str;
  };

  const totalPages = Math.ceil(totalTickets / 20);

  return (
    <>
      <Head>
        <title>工單管理 | OMS 原型</title>
      </Head>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">工單管理</h1>
        <div className="flex items-center space-x-3">
          <button className="btn-outline px-4 py-2.5 text-sm font-medium rounded-md flex items-center space-x-1 md:py-2" onClick={clearFilters}>清除篩選</button>
          <PermissionGuard required={Permission.EXPORT_TICKETS}>
            <button className="btn-outline px-4 py-2.5 text-sm font-medium rounded-md flex items-center space-x-1 md:py-2" onClick={handleExport}>
              <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
              匯出 Excel
            </button>
          </PermissionGuard>
          <PermissionGuard required={Permission.CREATE_TICKETS}>
            <Link href={`/tickets/new?returnUrl=${encodeURIComponent(router.asPath)}`} className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 md:py-2">
              <PlusIcon className="h-5 w-5 mr-2" />
              新增工單
            </Link>
          </PermissionGuard>
        </div>
      </div>

      <ViewTabs
        views={savedViews}
        activeViewId={selectedViewId}
        isFilterModified={isFilterModified}
        onSelectView={(view) => view ? handleApplyView(view.id) : clearFilters()}
        onSaveView={() => setIsSaveViewModalOpen(true)}
        onSaveAsNewView={() => { updateQuery({ view: undefined }); setIsSaveViewModalOpen(true); }}
        onManageViews={() => setIsManageViewsModalOpen(true)}
        onSetDefaultView={handleSetDefaultView}
        onDeleteView={handleDeleteView}
      />

      <div className="bg-white shadow-sm rounded-lg p-4 mb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex-grow flex items-center">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><MagnifyingGlassIcon className="h-5 w-5 text-gray-400" /></div>
              <input
                type="text"
                placeholder="搜尋工單..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm placeholder:text-sm"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && updateQuery({ search: localSearch })}
              />
            </div>
            <button type="button" onClick={() => updateQuery({ search: localSearch })} className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-r-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 whitespace-nowrap">
              <MagnifyingGlassIcon className="h-4 w-4 mr-1" />
              搜尋
            </button>
          </div>
          <div className="md:hidden">
            <button onClick={() => setIsFilterVisible(!isFilterVisible)} className="btn-outline w-full flex items-center justify-center px-4 py-1.5 text-sm">
              <FunnelIcon className="h-5 w-5 mr-2" />
              {isFilterVisible ? '隱藏篩選' : '顯示篩選'}
            </button>
          </div>
        </div>

        {isFilterVisible && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 md:pt-0">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">狀態</label>
              <button type="button" onClick={() => setIsStatusModalOpen(true)} className="block w-full py-2.5 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-left md:py-2">
                {status.length > 0 ? `已選 ${status.length} 個狀態` : '選擇狀態...'}
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">優先級</label>
              <button type="button" onClick={() => setIsPriorityModalOpen(true)} className="block w-full py-2.5 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-left md:py-2">
                {priority.length > 0 ? `已選 ${priority.length} 個優先級` : '選擇優先級...'}
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">地點</label>
              <button type="button" onClick={() => setIsLocationModalOpen(true)} className="block w-full py-2.5 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-left md:py-2">
                {locationIds.length > 0 ? `已選 ${locationIds.length} 個地點` : '選擇地點...'}
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">指派角色</label>
              <button type="button" onClick={() => setIsRoleModalOpen(true)} className="block w-full py-2.5 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-left md:py-2">
                {roleIds.length > 0 ? `已選 ${roleIds.length} 個角色` : '選擇角色...'}
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">建立者</label>
              <button type="button" onClick={() => setIsCreatorModalOpen(true)} className="block w-full py-2.5 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-left md:py-2">
                {creatorIds.length > 0 ? `已選 ${creatorIds.length} 個建立者` : '選擇建立者...'}
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">負責人</label>
              <button type="button" onClick={() => setIsAssigneeModalOpen(true)} className="block w-full py-2.5 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-left md:py-2">
                {assigneeIds.length > 0 ? `已選 ${assigneeIds.length} 個負責人` : '選擇負責人...'}
              </button>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">建立日期範圍</label>
              <DatePicker
                selectsRange={true}
                startDate={dateRange[0]}
                endDate={dateRange[1]}
                onChange={(update: [Date | null, Date | null]) => {
                  updateQuery({ startDate: update[0] ? format(update[0], 'yyyy-MM-dd') : undefined, endDate: update[1] ? format(update[1], 'yyyy-MM-dd') : undefined });
                }}
                isClearable={true}
                locale={zhTW}
                placeholderText="選擇日期範圍"
                dateFormat="yyyy/MM/dd"
                className="block w-full py-2.5 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-left md:py-2"
              />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden w-full border border-gray-200">
        {loading ? (
          <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div></div>
        ) : error ? (
          <div className="text-center py-12"><ExclamationCircleIcon className="mx-auto h-12 w-12 text-red-400" /><h3 className="mt-2 text-sm font-medium text-gray-900">{error}</h3></div>
        ) : tickets.length > 0 ? (
          <div>
            <div className="overflow-x-auto w-full">
              <table className="w-full divide-y divide-gray-200 table-auto md:table-fixed min-w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th scope="col" className="px-2 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer w-32 min-w-max" onClick={() => handleSort('id')}>
                      <div className="flex items-center space-x-1"><span>ID</span><SortIcon field="id" sortField={sortField} sortOrder={sortOrder} /></div>
                    </th>
                    <th scope="col" className="px-2 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer w-48 min-w-max whitespace-nowrap" onClick={() => handleSort('title')}>
                      <div className="flex items-center space-x-1"><span>標題</span><SortIcon field="title" sortField={sortField} sortOrder={sortOrder} /></div>
                    </th>
                    <th scope="col" className="px-2 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer w-20 min-w-max whitespace-nowrap" onClick={() => handleSort('status')}>
                      <div className="flex items-center space-x-1"><span>狀態</span><SortIcon field="status" sortField={sortField} sortOrder={sortOrder} /></div>
                    </th>
                    <th scope="col" className="px-2 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer w-20 min-w-max whitespace-nowrap" onClick={() => handleSort('priority')}>
                      <div className="flex items-center space-x-1"><span>優先級</span><SortIcon field="priority" sortField={sortField} sortOrder={sortOrder} /></div>
                    </th>
                    <th scope="col" className="px-2 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer w-20 min-w-max whitespace-nowrap" onClick={() => handleSort('location')}>
                      <div className="flex items-center space-x-1"><span>地點</span><SortIcon field="location" sortField={sortField} sortOrder={sortOrder} /></div>
                    </th>
                    <th scope="col" className="px-2 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer w-48 min-w-max whitespace-nowrap" onClick={() => handleSort('createdAt')}>
                      <div className="flex items-center space-x-1"><span>建立時間</span><SortIcon field="createdAt" sortField={sortField} sortOrder={sortOrder} /></div>
                    </th>
                    <th scope="col" className="px-2 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer w-24 min-w-max whitespace-nowrap" onClick={() => handleSort('role')}>
                      <div className="flex items-center space-x-1"><span>指派角色</span><SortIcon field="role" sortField={sortField} sortOrder={sortOrder} /></div>
                    </th>
                    <th scope="col" className="px-2 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer w-20 min-w-max whitespace-nowrap" onClick={() => handleSort('creator')}>
                      <div className="flex items-center space-x-1"><span>建立者</span><SortIcon field="creator" sortField={sortField} sortOrder={sortOrder} /></div>
                    </th>
                    <th scope="col" className="px-2 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer w-20 min-w-max whitespace-nowrap" onClick={() => handleSort('assignee')}>
                      <div className="flex items-center space-x-1"><span>負責人</span><SortIcon field="assignee" sortField={sortField} sortOrder={sortOrder} /></div>
                    </th>
                    <th scope="col" className="px-2 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider w-16 min-w-max whitespace-nowrap">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/tickets/${ticket.id}?returnUrl=${encodeURIComponent(router.asPath)}`)}>
                      <td className="p-0"><TooltipCell content={ticket.id} className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 w-full h-full flex items-center">#{ticket.id}</TooltipCell></td>
                      <td className="p-0"><TooltipCell content={<><p className="font-bold">{ticket.title}</p><p className="text-sm text-gray-700 mt-2">{ticket.description}</p></>} className="px-2 py-3 whitespace-nowrap md:text-ellipsis md:overflow-hidden w-full h-full flex flex-col justify-center"><div className="text-sm font-medium text-gray-900 md:truncate" title={ticket.title}>{truncateString(ticket.title, 30)}</div><div className="text-sm text-gray-500 md:truncate whitespace-normal" title={ticket.description}>{truncateString(ticket.description, 30)}</div></TooltipCell></td>
                      <td className="px-2 py-3 whitespace-nowrap"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>{getStatusText(ticket.status)}</span></td>
                      <td className="px-2 py-3 whitespace-nowrap"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>{getPriorityText(ticket.priority)}</span></td>
                      <td className="p-0"><TooltipCell content={[...new Set(ticket.reports.map((r) => r.report.location?.name).filter(Boolean))].join(', ') || '無'} className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 w-full h-full">{(() => { const locations = [...new Set(ticket.reports.map((r) => r.report.location?.name).filter(Boolean))] as string[]; if (locations.length === 0) return '無'; const displayLocations = locations.slice(0, 2); const remainingCount = locations.length - displayLocations.length; return (<>{displayLocations.map((loc) => (<span key={loc} className="block md:text-ellipsis md:overflow-hidden">{loc}</span>))}{remainingCount > 0 && (<span className="text-xs text-gray-500">...及其他 {remainingCount} 個地點</span>)}</>);})()}</TooltipCell></td>
                      <td className="p-0"><TooltipCell content={formatDate(ticket.createdAt)} className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 md:text-ellipsis md:overflow-hidden w-full h-full">{formatDate(ticket.createdAt)}</TooltipCell></td>
                      <td className="p-0"><TooltipCell content={getRoleName(ticket.role?.name) || '未指派'} className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 md:text-ellipsis md:overflow-hidden w-full h-full">{getRoleName(ticket.role?.name) || '未指派'}</TooltipCell></td>
                      <td className="p-0"><TooltipCell content={ticket.creator?.name || '未知'} className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 md:text-ellipsis md:overflow-hidden w-full h-full">{ticket.creator?.name || '未知'}</TooltipCell></td>
                      <td className="p-0"><TooltipCell content={ticket.assignee?.name || '未指派'} className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 md:text-ellipsis md:overflow-hidden w-full h-full">{ticket.assignee?.name || '未指派'}</TooltipCell></td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500"><div className="flex items-center space-x-2"><PermissionGuard required={Permission.EDIT_TICKETS}><Link href={`/tickets/${ticket.id}/edit`} className="text-blue-600 hover:text-blue-900" title="編輯" onClick={(e) => e.stopPropagation()}><PencilIcon className="h-5 w-5" /></Link></PermissionGuard><PermissionGuard required={Permission.DELETE_TICKETS}><button onClick={(e) => { e.stopPropagation(); handleDeleteTicket(ticket.id, ticket.title); }} className="text-red-600 hover:text-red-900" title="刪除"><TrashIcon className="h-5 w-5" /></button></PermissionGuard></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center mt-4 p-4">
              <p className="text-sm text-gray-700">顯示{' '}<span className="font-medium">{totalTickets > 0 ? (page - 1) * 20 + 1 : 0}</span>{' '}到{' '}<span className="font-medium">{Math.min(page * 20, totalTickets)}</span>{' '}筆，共 <span className="font-medium">{totalTickets}</span> 筆</p>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button onClick={() => updateQuery({ page: page - 1 })} disabled={page === 1} className="relative inline-flex items-center px-3 py-2.5 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 md:px-2 md:py-2"><span className="sr-only">上一頁</span><ChevronLeftIcon className="h-5 w-5" aria-hidden="true" /></button>
                {Array.from({ length: totalPages }).map((_, i) => (<button key={i} onClick={() => updateQuery({ page: i + 1 })} className={`relative inline-flex items-center px-5 py-2.5 border border-gray-300 bg-white text-sm font-medium ${page === i + 1 ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}>{i + 1}</button>)).slice(Math.max(0, page - 3), Math.min(totalPages, page + 2))}
                <button onClick={() => updateQuery({ page: page + 1 })} disabled={page >= totalPages} className="relative inline-flex items-center px-3 py-2.5 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 md:px-2 md:py-2"><span className="sr-only">下一頁</span><ChevronRightIcon className="h-5 w-5" aria-hidden="true" /></button>
              </nav>
            </div>
          </div>
        ) : (
          <div className="text-center py-12"><FunnelIcon className="mx-auto h-12 w-12 text-gray-400" /><h3 className="mt-2 text-sm font-medium text-gray-900">沒有符合條件的工單</h3><p className="mt-1 text-sm text-gray-500">請嘗試調整篩選條件或建立新工單。</p><div className="mt-6"><Link href="/tickets/new" className="btn-primary">建立工單</Link></div></div>
        )}
      </div>

      {/* Modals */}
      <SaveViewModal isOpen={isSaveViewModalOpen} onClose={() => setIsSaveViewModalOpen(false)} onSave={handleSaveView} errorMessage={saveViewError} isUpdate={!!selectedViewId && !isFilterModified} initialViewName={selectedViewId ? savedViews.find((v) => v.id === selectedViewId)?.name || '' : ''} />
      <ManageViewsModal isOpen={isManageViewsModalOpen} onClose={() => setIsManageViewsModalOpen(false)} savedViews={savedViews} onDeleteView={handleDeleteView} onSetDefaultView={handleSetDefaultView} />
      <MultiSelectFilterModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} onConfirm={(selected) => { updateQuery({ locationIds: selected }); setIsLocationModalOpen(false); }} initialSelectedIds={locationIds} options={allLocations.map((loc) => ({ id: loc.id, name: loc.name }))} title="選擇地點" />
      <MultiSelectFilterModal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} onConfirm={(selected) => { updateQuery({ status: selected }); setIsStatusModalOpen(false); }} initialSelectedIds={status} options={Object.values(TicketStatus).map((s) => ({ id: s, name: getStatusText(s) }))} title="選擇狀態" />
      <MultiSelectFilterModal isOpen={isPriorityModalOpen} onClose={() => setIsPriorityModalOpen(false)} onConfirm={(selected) => { updateQuery({ priority: selected }); setIsPriorityModalOpen(false); }} initialSelectedIds={priority} options={Object.values(TicketPriority).map((p) => ({ id: p, name: getPriorityText(p) }))} title="選擇優先級" />
      <MultiSelectFilterModal isOpen={isRoleModalOpen} onClose={() => setIsRoleModalOpen(false)} onConfirm={(selected) => { updateQuery({ roleIds: selected }); setIsRoleModalOpen(false); }} initialSelectedIds={roleIds} options={allRoles.map((r) => ({ id: r.id, name: getRoleName(r.name) }))} title="選擇指派角色" />
      <MultiSelectFilterModal isOpen={isCreatorModalOpen} onClose={() => setIsCreatorModalOpen(false)} onConfirm={(selected) => { updateQuery({ creatorIds: selected }); setIsCreatorModalOpen(false); }} initialSelectedIds={creatorIds} options={allUsers.map((c) => ({ id: c.id, name: c.name }))} title="選擇建立者" />
      <MultiSelectFilterModal isOpen={isAssigneeModalOpen} onClose={() => setIsAssigneeModalOpen(false)} onConfirm={(selected) => { updateQuery({ assigneeIds: selected }); setIsAssigneeModalOpen(false); }} initialSelectedIds={assigneeIds} options={allAssignees.map((a) => ({ id: a.id, name: a.name }))} title="選擇負責人" />
    </>
  );
}