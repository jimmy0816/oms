import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  ExclamationCircleIcon,
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
import { ReportStatus, ReportPriority, Category } from 'shared-types';
import { useAuth } from '@/contexts/AuthContext';
import { categoryService, getCategoryPath } from '@/services/categoryService';

export default function Reports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalReports, setTotalReports] = useState(0);
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);

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

  // 從 API 加載報告數據
  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 構建過濾條件
      const filters: Record<string, string> = {};
      if (statusFilter) filters.status = statusFilter;
      if (categoryFilter) filters.category = categoryFilter;
      if (priorityFilter) filters.priority = priorityFilter;
      if (searchTerm) filters.search = searchTerm;

      // 調用 API 獲取報告
      const response = await reportService.getAllReports(
        page,
        pageSize,
        filters
      );

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

  // 清除過濾條件
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setCategoryFilter('');
    setPriorityFilter('');
    setPage(1);
  };

  // 初始化時加載數據
  useEffect(() => {
    loadReports();
  }, [loadReports]);

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

  return (
    <>
      <Head>
        <title>通報管理 | OMS 原型</title>
      </Head>

      <div className="space-y-6">
        {/* 頁面標題 */}
        <div className="py-6">
          <div className="mx-auto">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-semibold text-gray-900">通報管理</h1>
              <div className="flex space-x-2">
                <button
                  className="btn-outline flex items-center space-x-1"
                  onClick={clearFilters}
                >
                  清除篩選
                </button>
                {user?.permissions?.includes('create_reports') && (
                  <Link
                    href="/reports/new"
                    className="btn-primary flex items-center"
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    <span>建立通報</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 篩選和搜尋 */}
        <div className="bg-white shadow-sm rounded-lg p-4">
          <div className="flex flex-wrap gap-4 mb-6">
            {/* 搜索和過濾區域 */}
            <div className="w-full md:w-1/3 lg:w-1/4">
              <div className="relative flex">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="搜尋通報..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  className="ml-2 inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 whitespace-nowrap"
                >
                  <MagnifyingGlassIcon className="h-4 w-4 mr-1" />
                  搜尋
                </button>
              </div>
            </div>

            {/* 狀態篩選 */}
            <div className="w-full md:w-auto">
              <div className="relative">
                <select
                  className="block w-full py-2 px-3 pr-8 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm appearance-none"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
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
            </div>

            {/* 類別篩選 */}
            <div className="w-full md:w-auto">
              <div className="relative">
                <select
                  className="block w-full py-2 px-3 pr-8 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm appearance-none"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
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
            </div>

            {/* 優先級篩選 */}
            <div className="w-full md:w-auto">
              <div className="relative">
                <select
                  className="block w-full py-2 px-3 pr-8 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm appearance-none"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                >
                  <option value="">全部優先級</option>
                  <option value={ReportPriority.LOW}>低</option>
                  <option value={ReportPriority.MEDIUM}>中</option>
                  <option value={ReportPriority.HIGH}>高</option>
                  <option value={ReportPriority.URGENT}>緊急</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 通報列表 */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden w-full">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <ExclamationCircleIcon className="mx-auto h-12 w-12 text-red-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {error}
              </h3>
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
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12"
                      >
                        ID
                      </th>
                      <th
                        scope="col"
                        className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4"
                      >
                        標題
                      </th>
                      <th
                        scope="col"
                        className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20"
                      >
                        狀態
                      </th>
                      <th
                        scope="col"
                        className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20"
                      >
                        類別
                      </th>
                      <th
                        scope="col"
                        className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16"
                      >
                        優先級
                      </th>
                      <th
                        scope="col"
                        className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24"
                      >
                        地點
                      </th>
                      <th
                        scope="col"
                        className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32"
                      >
                        建立時間
                      </th>
                      <th
                        scope="col"
                        className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24"
                      >
                        建立者
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
                        <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500">
                          {report.location?.name}
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 text-ellipsis overflow-hidden">
                          {formatDate(report.createdAt)}
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 text-ellipsis overflow-hidden">
                          {report.creator?.name || '未知'}
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

                <nav className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    className={`px-3 py-1 rounded ${
                      page === 1
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    上一頁
                  </button>

                  {Array.from({
                    length: Math.ceil(totalReports / pageSize) || 1,
                  })
                    .map((_, i) => (
                      <button
                        key={i}
                        onClick={() => handlePageChange(i + 1)}
                        className={`px-3 py-1 rounded ${
                          page === i + 1
                            ? 'bg-blue-600 text-white'
                            : 'text-blue-600 hover:bg-blue-50'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))
                    .slice(
                      Math.max(0, page - 3),
                      Math.min(
                        Math.ceil(totalReports / pageSize) || 1,
                        page + 2
                      )
                    )}

                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= Math.ceil(totalReports / pageSize)}
                    className={`px-3 py-1 rounded ${
                      page >= Math.ceil(totalReports / pageSize)
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    下一頁
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
      </div>
    </>
  );
}
