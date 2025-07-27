import React, { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  ExclamationCircleIcon,
  PencilIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon, // Added ChevronDownIcon
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/react/24/outline';
import {
  reportService,
  Report,
  getStatusName,
  getStatusColor,
  getStatusIcon,
  getPriorityColor,
  getPriorityText,
} from '@/services/reportService';
import {
  SavedView,
  ReportStatus,
  Category,
  ReportPriority,
} from 'shared-types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { categoryService, getCategoryPath } from '@/services/categoryService';
import { savedViewService } from '@/services/savedViewService';
import LocationFilterModal from '@/components/LocationFilterModal';
import SaveViewModal from '@/components/SaveViewModal';
import ManageViewsModal from '@/components/ManageViewsModal';
import ViewSelectorModal from '@/components/ViewSelectorModal'; // New import

export default function Reports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState<number[]>([]);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalReports, setTotalReports] = useState(0);
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [isSaveViewModalOpen, setIsSaveViewModalOpen] = useState(false);
  const [isManageViewsModalOpen, setIsManageViewsModalOpen] = useState(false);
  const [isViewSelectorModalOpen, setIsViewSelectorModalOpen] = useState(false); // New state
  const [saveViewError, setSaveViewError] = useState<string | null>(null);
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null);
  const [isFilterModified, setIsFilterModified] = useState(false);
  const { showToast } = useToast();
  const isInitialLoad = useRef(true);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);

  const handleDelete = async (reportId: string, reportTitle: string) => {
    if (
      window.confirm(`您確定要刪除通報「${reportTitle}」嗎？此操作無法復原。`)
    ) {
      try {
        await reportService.deleteReport(reportId);
        showToast('通報已成功刪除！', 'success');
        loadReports(); // 重新加載通報列表
      } catch (error) {
        console.error('刪除通報失敗:', error);
        showToast('刪除通報失敗，請稍後再試。', 'error');
      }
    }
  };

  const handleDeleteView = async (viewId: string) => {
    if (window.confirm('您確定要刪除此視圖嗎？')) {
      try {
        await savedViewService.deleteSavedView(viewId);
        showToast('視圖已成功刪除！', 'success');
        loadSavedViews(); // 重新加載儲存的視圖
        if (selectedViewId === viewId) {
          // 如果刪除的是當前選中的視圖，則清除篩選
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
      await savedViewService.setDefaultSavedView(viewId, 'REPORT');
      showToast('預設視圖已設定！', 'success');
      await loadSavedViews(); // Reload saved views to reflect new default
    } catch (error) {
      console.error('設定預設視圖失敗:', error);
      showToast('設定預設視圖失敗，請稍後再試。', 'error');
    }
  };

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const fetchedCategories = await categoryService.getAllCategories();
        setCategories(fetchedCategories);
        console.log('Fetched categories:', fetchedCategories); // Debug: Log fetched categories
      } catch (err) {
        console.error('Error fetching categories:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  // Fetch saved views on component mount
  const loadSavedViews = useCallback(async () => {
    if (!user) return; // Only load if user is authenticated
    try {
      const views = await savedViewService.getAllSavedViews('REPORT');
      setSavedViews(views);
    } catch (error) {
      console.error('Failed to load saved views:', error);
    }
  }, [user]);

  // 從 API 加載報告數據
  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 構建過濾條件
      const filters: {
        status?: string;
        category?: string;
        priority?: string;
        search?: string;
        locationIds?: number[];
        sortField?: string;
        sortOrder?: 'asc' | 'desc';
      } = {};
      if (statusFilter) filters.status = statusFilter;
      if (categoryFilter) filters.category = categoryFilter;
      if (priorityFilter) filters.priority = priorityFilter;
      if (searchTerm) filters.search = searchTerm;
      if (locationFilter.length > 0) filters.locationIds = locationFilter;
      if (sortField) filters.sortField = sortField;
      if (sortOrder) filters.sortOrder = sortOrder;

      console.log('Loading reports with filters:', filters); // Debug log

      // 調用 API 獲取報告
      const response = await reportService.getAllReports(
        page,
        pageSize,
        filters
      );

      console.log('report with filters', response);

      setReports(response.items);
      setTotalReports(response.total);
    } catch (e) {
      console.error('Error loading reports:', e);
      setError('加載通報數據失敗，請稍後重試');
    } finally {
      setLoading(false);
    }
  }, [
    page,
    pageSize,
    statusFilter,
    categoryFilter,
    priorityFilter,
    searchTerm,
    locationFilter,
    sortField,
    sortOrder,
  ]);

  // 處理搜索和過濾
  const handleSearch = () => {
    // 重置頁碼並觸發重新加載
    setPage(1);
    loadReports(); // 直接調用 loadReports 立即執行搜尋
  };

  // 處理頁碼變化
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleSort = (field: string) => {
    const isAsc = sortField === field && sortOrder === 'asc';
    setSortOrder(isAsc ? 'desc' : 'asc');
    setSortField(field);
    setPage(1); // Reset page to 1 when sorting changes
  };

  // 清除過濾條件
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setCategoryFilter('');
    setPriorityFilter('');
    setLocationFilter([]);
    setSelectedViewId(null); // Clear selected view
    setPage(1);
    setSortField(null);
    setSortOrder(null);
    setIsFilterModified(false);
  };

  // 處理儲存視圖
  const handleSaveView = async (viewName: string) => {
    try {
      const currentFilters = {
          searchTerm,
          statusFilter,
          categoryFilter,
          priorityFilter,
          locationFilter,
          sortField,
          sortOrder,
        };

      if (selectedViewId) {
        // 如果有選中的視圖，則更新它
        await savedViewService.updateSavedView(
          selectedViewId,
          viewName,
          currentFilters
        );
        showToast('視圖已成功更新！', 'success');
      } else {
        // 否則創建一個新的視圖
        await savedViewService.createSavedView(
          viewName,
          currentFilters,
          'REPORT'
        );
        showToast('視圖已成功儲存！', 'success');
      }

      await loadSavedViews(); // Reload saved views after saving/updating
      setIsSaveViewModalOpen(false);
      setSaveViewError(null);
      setIsFilterModified(false);
    } catch (error: any) {
      console.error('Failed to save view:', error);
      setSaveViewError(error.message || '儲存視圖失敗');
    }
  };

  useEffect(() => {
    loadSavedViews();
  }, [loadSavedViews]);

  // 處理套用視圖
  const handleApplyView = useCallback(
    (viewId: string) => {
      const viewToApply = savedViews.find((view) => view.id === viewId);
      if (viewToApply) {
        setSearchTerm(viewToApply.filters.searchTerm || '');
        setStatusFilter(viewToApply.filters.statusFilter || '');
        setCategoryFilter(viewToApply.filters.categoryFilter || '');
        setPriorityFilter(viewToApply.filters.priorityFilter || '');
        setLocationFilter(viewToApply.filters.locationFilter || []);
        setSelectedViewId(viewId);
        setPage(1);
        setSortField(viewToApply.filters.sortField || null);
        setSortOrder(viewToApply.filters.sortOrder || null);
        setIsFilterModified(false);
      }
    },
    [savedViews]
  );

  // 初始化時加載數據
  useEffect(() => {
    loadReports();
  }, [loadReports]);

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

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('目前 user 權限:', user?.permissions);
    }
  }, [user]);

  // 格式化日期
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

  // 取得狀態顏色和圖標
  const getStatusInfo = (status: string) => {
    const IconComponent = getStatusIcon(status);
    return {
      color: getStatusColor(status),
      icon: <IconComponent className="h-3 w-3 mr-1" />,
    };
  };

  const currentViewName = selectedViewId
    ? savedViews.find((view) => view.id === selectedViewId)?.name
    : '所有通報'; // Changed from '新增視圖' to '所有通報' for clarity when no view is selected

  return (
    <>
      <Head>
        <title>通報管理 | OMS 原型</title>
      </Head>

      <div className="space-y-6">
        {/* 頁面標題 */}
        <div className="py-4">
          <div className="mx-auto">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-semibold text-gray-900">通報管理</h1>
              <div className="flex items-center space-x-3">
                <button
                  className="btn-outline px-4 py-2 text-sm font-medium rounded-md flex items-center space-x-1"
                  onClick={clearFilters}
                >
                  清除篩選
                </button>
                {user?.permissions?.includes('create_reports') && (
                  <Link
                    href="/reports/new"
                    className="btn-primary px-4 py-2 text-sm font-medium rounded-md flex items-center"
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    <span>建立通報</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Saved Views Section */}
      <div className="py-1">
        <div className="mx-auto">
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
                placeholder="搜尋通報..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsFilterModified(true);
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <button
              type="button"
              onClick={handleSearch}
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
            <select
              id="status-filter"
              className="block w-full py-2 px-3 pr-8 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm appearance-none"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setIsFilterModified(true);
              }}
            >
              <option value="">全部狀態</option>
              <option value={ReportStatus.UNCONFIRMED}>未確認</option>
              <option value={ReportStatus.PROCESSING}>處理中</option>
              <option value={ReportStatus.REJECTED}>不處理</option>
              <option value={ReportStatus.PENDING_REVIEW}>待審核</option>
              <option value={ReportStatus.REVIEWED}>已歸檔</option>
              <option value={ReportStatus.RETURNED}>已退回</option>
            </select>
          </div>

          {/* 類別篩選 */}
          <div>
            <label
              htmlFor="category-filter"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              類別
            </label>
            <select
              id="category-filter"
              className="block w-full py-2 px-3 pr-8 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm appearance-none"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setIsFilterModified(true);
              }}
            >
              <option value="">全部類別</option>
              {categories
                .filter((cat) => cat.level === 1)
                .map((cat1) => (
                  <option key={cat1.id} value={cat1.id}>
                    {cat1.name}
                  </option>
                ))}
            </select>
          </div>

          {/* 優先級篩選 */}
          <div>
            <label
              htmlFor="priority-filter"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              優先級
            </label>
            <select
              id="priority-filter"
              className="block w-full py-2 px-3 pr-8 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm appearance-none"
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setIsFilterModified(true);
              }}
            >
              <option value="">全部優先級</option>
              <option value={ReportPriority.LOW}>低</option>
              <option value={ReportPriority.MEDIUM}>中</option>
              <option value={ReportPriority.HIGH}>高</option>
              <option value={ReportPriority.URGENT}>緊急</option>
            </select>
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
              {locationFilter.length > 0
                ? `已選 ${locationFilter.length} 個地點`
                : '選擇地點...'}
            </button>
          </div>
        </div>
      </div>

      {/* Location Filter Modal */}
      <LocationFilterModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onConfirm={(selectedIds) => {
          setLocationFilter(selectedIds);
          setIsLocationModalOpen(false);
          setPage(1); // Reset page when filter changes
          setIsFilterModified(true); // Set filter modified when location changes
        }}
        initialSelectedLocationIds={locationFilter}
      />

      {/* Save View Modal */}
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

      {/* Manage Views Modal */}
      <ManageViewsModal
        isOpen={isManageViewsModalOpen}
        onClose={() => setIsManageViewsModalOpen(false)}
        savedViews={savedViews}
        onDeleteView={handleDeleteView}
        onSetDefaultView={handleSetDefaultView}
      />

      {/* View Selector Modal */}
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
          setSelectedViewId(null); // Clear selected view to force new save
          setIsSaveViewModalOpen(true);
          setIsViewSelectorModalOpen(false);
        }}
        onClearView={() => {
          clearFilters();
          setIsViewSelectorModalOpen(false);
        }}
        selectedViewId={selectedViewId}
      />

      {/* 通報列表 */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden w-full border border-gray-200">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <ExclamationCircleIcon className="mx-auto h-12 w-12 text-red-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{error}</h3>
            <p className="mt-1 text-sm text-gray-500">
              請稍後重試或聯繫管理員。
            </p>
            <div className="mt-6">
              <button onClick={loadReports} className="btn-primary">
                重試
              </button>
            </div>
          </div>
        ) : reports.length > 0 ? (
          <div>
            <div className="overflow-x-auto w-full">
              <table className="w-full divide-y divide-gray-200 table-fixed">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th
                      scope="col"
                      className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12"
                    >
                      ID
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4 cursor-pointer"
                      onClick={() => handleSort('title')}
                    >
                      <div className="flex items-center">
                        標題
                        {sortField === 'title' && (
                          sortOrder === 'asc' ? (
                            <ArrowUpIcon className="h-3 w-3 ml-1" />
                          ) : (
                            <ArrowDownIcon className="h-3 w-3 ml-1" />
                          )
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20 cursor-pointer"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center">
                        狀態
                        {sortField === 'status' && (
                          sortOrder === 'asc' ? (
                            <ArrowUpIcon className="h-3 w-3 ml-1" />
                          ) : (
                            <ArrowDownIcon className="h-3 w-3 ml-1" />
                          )
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20 cursor-pointer"
                      onClick={() => handleSort('category')}
                    >
                      <div className="flex items-center">
                        類別
                        {sortField === 'category' && (
                          sortOrder === 'asc' ? (
                            <ArrowUpIcon className="h-3 w-3 ml-1" />
                          ) : (
                            <ArrowDownIcon className="h-3 w-3 ml-1" />
                          )
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16 cursor-pointer"
                      onClick={() => handleSort('priority')}
                    >
                      <div className="flex items-center">
                        優先級
                        {sortField === 'priority' && (
                          sortOrder === 'asc' ? (
                            <ArrowUpIcon className="h-3 w-3 ml-1" />
                          ) : (
                            <ArrowDownIcon className="h-3 w-3 ml-1" />
                          )
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24 cursor-pointer"
                      onClick={() => handleSort('location')}
                    >
                      <div className="flex items-center">
                        地點
                        {sortField === 'location' && (
                          sortOrder === 'asc' ? (
                            <ArrowUpIcon className="h-3 w-3 ml-1" />
                          ) : (
                            <ArrowDownIcon className="h-3 w-3 ml-1" />
                          )
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24 cursor-pointer"
                      onClick={() => handleSort('createdAt')}
                    >
                      <div className="flex items-center">
                        建立時間
                        {sortField === 'createdAt' && (
                          sortOrder === 'asc' ? (
                            <ArrowUpIcon className="h-3 w-3 ml-1" />
                          ) : (
                            <ArrowDownIcon className="h-3 w-3 ml-1" />
                          )
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24 cursor-pointer"
                      onClick={() => handleSort('creator')}
                    >
                      <div className="flex items-center">
                        建立者
                        {sortField === 'creator' && (
                          sortOrder === 'asc' ? (
                            <ArrowUpIcon className="h-3 w-3 ml-1" />
                          ) : (
                            <ArrowDownIcon className="h-3 w-3 ml-1" />
                          )
                        )}
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
                  {reports.map((report) => (
                    <tr
                      key={report.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() =>
                        (window.location.href = `/reports/${report.id}`)
                      }
                    >
                      <td
                        className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 truncate overflow-hidden"
                        title={report.id}
                      >
                        #{report.id.substring(0, 8)}...
                      </td>
                      <td className="px-2 py-3 whitespace-normal">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {report.title}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          {report.description}
                        </div>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            getStatusInfo(report.status).color
                          }`}
                        >
                          {getStatusInfo(report.status).icon}
                          {getStatusName(report.status)}
                        </span>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 text-ellipsis overflow-hidden">
                        {getCategoryPath(report.categoryId, categories)
                          ?.split(' > ')
                          .slice(1)
                          .join(' > ')}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(
                            report.priority
                          )}`}
                        >
                          {getPriorityText(report.priority as ReportPriority)}
                        </span>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 text-ellipsis overflow-hidden">
                        {report.location?.name}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 text-ellipsis overflow-hidden">
                        {formatDate(report.createdAt)}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 text-ellipsis overflow-hidden">
                        {report.creator?.name || '未知'}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center space-x-2">
                          {user?.permissions?.includes('review_reports') && (
                            <Link
                              href={`/reports/${report.id}/edit`}
                              className="text-blue-600 hover:text-blue-900"
                              title="編輯"
                              onClick={(e) => e.stopPropagation()} // 阻止行點擊事件
                            >
                              <PencilIcon className="h-5 w-5" />
                            </Link>
                          )}
                          {user?.permissions?.includes('review_reports') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // 阻止行點擊事件
                                handleDelete(report.id, report.title);
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

            {/* 分頁控制 */}
            <div className="flex justify-between items-center mt-4 p-4">
              <p className="text-sm text-gray-700">
                顯示{' '}
                <span className="font-medium">
                  {totalReports > 0 ? (page - 1) * pageSize + 1 : 0}
                </span>{' '}
                到{' '}
                <span className="font-medium">
                  {Math.min(page * pageSize, totalReports)}
                </span>{' '}
                筆，共 <span className="font-medium">{totalReports}</span> 筆
              </p>

              <nav
                className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                aria-label="Pagination"
              >
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  <span className="sr-only">上一頁</span>
                  <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                </button>

                {/* 頁碼顯示 */}
                {Array.from({
                  length: Math.ceil(totalReports / pageSize) || 1,
                })
                  .map((_, i) => (
                    <button
                      key={i}
                      onClick={() => handlePageChange(i + 1)}
                      className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${
                        page === i + 1
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))
                  .slice(
                    Math.max(0, page - 3),
                    Math.min(Math.ceil(totalReports / pageSize) || 1, page + 2)
                  )}

                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= Math.ceil(totalReports / pageSize)}
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
              沒有符合條件的通報
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              請嘗試調整篩選條件或建立新通報。
            </p>
            <div className="mt-6">
              <Link href="/reports/new" className="btn-primary">
                建立通報
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
