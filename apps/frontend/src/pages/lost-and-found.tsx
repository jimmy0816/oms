import React, { useState, useEffect, useCallback } from 'react';
import { reportService } from '@/services/reportService';
import { locationService, Location } from '@/services/locationService';
import type { PublicReport } from 'shared-types';
import MultiSelectFilterModal from '@/components/MultiSelectFilterModal';
import { useAuth } from '@/contexts/AuthContext';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Bars3Icon,
  BarsArrowDownIcon,
  BarsArrowUpIcon,
} from '@heroicons/react/24/outline';

const SortIcon = ({
  field,
  sortField,
  sortOrder,
}: {
  field: string;
  sortField: string;
  sortOrder: 'asc' | 'desc';
}) => {
  if (sortField !== field) {
    return <Bars3Icon className="h-4 w-4 text-gray-400" />;
  }
  if (sortOrder === 'asc') {
    return <BarsArrowUpIcon className="h-4 w-4 text-black" />;
  }
  return <BarsArrowDownIcon className="h-4 w-4 text-black" />;
};

const Pagination = ({
  page,
  total,
  pageSize,
  onPageChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
}) => {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  return (
    <nav className="flex justify-between items-center mt-4 p-4">
      <p className="text-sm text-gray-700">
        顯示 <span className="font-medium">{(page - 1) * pageSize + 1}</span> 到{' '}
        <span className="font-medium">{Math.min(page * pageSize, total)}</span>{' '}
        筆，共 <span className="font-medium">{total}</span> 筆
      </p>
      <div className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>
    </nav>
  );
};

// The actual page content is extracted into its own component
const LostAndFoundPageContent = () => {
  const [reports, setReports] = useState<PublicReport[]>([]);
  const [locationFilter, setLocationFilter] = useState<string[]>([]);
  const [allLocations, setAllLocations] = useState<Location[]>([]);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalReports, setTotalReports] = useState(0);
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters = {
        locationIds: locationFilter,
        sortField,
        sortOrder,
      };
      const response = await reportService.getPublicReports(
        page,
        pageSize,
        filters
      );
      setReports(response.items);
      setTotalReports(response.total);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    }
    setIsLoading(false);
  }, [page, pageSize, locationFilter, sortField, sortOrder]);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const fetchedLocations = await locationService.getAllLocations();
        setAllLocations(fetchedLocations);
      } catch (error) {
        console.error('Failed to fetch locations:', error);
      }
    };
    fetchLocations();
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleSort = (field: string) => {
    const isAsc = sortField === field && sortOrder === 'asc';
    setSortOrder(isAsc ? 'desc' : 'asc');
    setSortField(field);
    setPage(1);
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">失物招領</h1>
        <p className="text-gray-600">
          此頁面顯示所有「撿到了別人的東西」分類下的公開通報案件。
        </p>
      </div>

      <div className="mb-6">
        <label
          htmlFor="location-filter"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          地點篩選
        </label>
        <button
          type="button"
          onClick={() => setIsLocationModalOpen(true)}
          className="block w-full md:w-1/4 py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-left"
        >
          {locationFilter.length > 0
            ? `已選 ${locationFilter.length} 個地點`
            : '選擇地點...'}
        </button>
      </div>

      <MultiSelectFilterModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onConfirm={(selectedIds) => {
          setLocationFilter(selectedIds as string[]);
          setIsLocationModalOpen(false);
          setPage(1);
        }}
        initialSelectedIds={locationFilter}
        options={allLocations.map((loc) => ({
          id: String(loc.id),
          name: loc.name,
        }))}
        title="選擇地點"
      />

      <div className="bg-white shadow-sm rounded-lg overflow-hidden w-full border border-gray-200">
        {isLoading ? (
          <div className="text-center p-10">載入中...</div>
        ) : reports.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('id')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>ID</span>
                        <SortIcon
                          field="id"
                          sortField={sortField}
                          sortOrder={sortOrder}
                        />
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      圖片
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      標題
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      描述
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('createdAt')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>建立時間</span>
                        <SortIcon
                          field="createdAt"
                          sortField={sortField}
                          sortOrder={sortOrder}
                        />
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('location')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>地點</span>
                        <SortIcon
                          field="location"
                          sortField={sortField}
                          sortOrder={sortOrder}
                        />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reports.map((report) => (
                    <tr key={report.id}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {report.id}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {report.attachments && report.attachments.length > 0 ? (
                          <a
                            href={report.attachments[0].url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <img
                              src={report.attachments[0].url}
                              alt={report.title}
                              className="h-16 w-16 object-cover rounded"
                            />
                          </a>
                        ) : (
                          <span>無圖片</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {report.title}
                      </td>
                      <td
                        className="px-4 py-4 text-sm text-gray-500 truncate"
                        style={{ maxWidth: '200px' }}
                        title={report.description}
                      >
                        {report.description}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(report.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {report.location?.name || '未指定'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              total={totalReports}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </>
        ) : (
          <div className="text-center p-10">
            <h3 className="text-lg font-semibold text-gray-700">沒有資料</h3>
            <p className="text-gray-500 mt-2">
              目前沒有符合條件的通報案件，或請嘗試清除地點篩選。
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const LostAndFoundPage = () => {
  const { user } = useAuth();
  return <LostAndFoundPageContent />;
};

export default LostAndFoundPage;
