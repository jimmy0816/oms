import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  FunnelIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import {
  TicketPriority,
  TicketStatus,
  TicketPermission,
  UserRole,
  Ticket,
  TicketWithDetails,
} from 'shared-types';
import ticketService from '../../services/ticketService';

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

  // 處理頁面變更
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // 從 API 加載工單數據
  useEffect(() => {
    const loadTickets = async () => {
      try {
        setLoading(true);
        // 構建過濾條件
        const apiFilters: Record<string, string> = {};
        if (filters.status) apiFilters.status = filters.status;
        if (filters.priority) apiFilters.priority = filters.priority;

        // 調用 API 獲取工單
        const ticketsData = await ticketService.getAllTickets(
          currentPage,
          pageSize,
          apiFilters
        );

        // 將 Ticket[] 轉換為 TicketWithDetails[]
        // 在實際应用中，這裡應該由後端返回正確的 TicketWithDetails 数据
        // 但現在我們只是臨時轉換以修復類型錯誤
        const ticketsWithDetails = ticketsData.items.map((ticket) => ({
          ...ticket,
          creator: {
            id: ticket.creatorId,
            name: `用戶 ${ticket.creator.name}`,
            email: `user${ticket.creatorId}@example.com`,
            role: 'ADMIN' as UserRole,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          assignee: ticket.assigneeId
            ? {
                id: ticket.assigneeId,
                name: `用戶 ${ticket.assigneeId}`,
                email: `user${ticket.assigneeId}@example.com`,
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
    };

    loadTickets();
  }, [currentPage, pageSize, filters.status, filters.priority]);

  // 格式化日期
  const formatDate = (date: Date) => {
    // 確保 date 是 Date 對象
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // 取得狀態文字說明
  const getStatusText = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.PENDING:
        return '待接單';
      case TicketStatus.IN_PROGRESS:
        return '處理中';
      case TicketStatus.COMPLETED:
        return '已完成';
      case TicketStatus.FAILED:
        return '無法完成';
      case TicketStatus.VERIFIED:
        return '驗收通過';
      case TicketStatus.VERIFICATION_FAILED:
        return '驗收不通過';
      default:
        return status;
    }
  };

  // 取得優先級文字說明
  const getPriorityText = (priority: TicketPriority) => {
    switch (priority) {
      case TicketPriority.LOW:
        return '低';
      case TicketPriority.MEDIUM:
        return '中';
      case TicketPriority.HIGH:
        return '高';
      case TicketPriority.URGENT:
        return '緊急';
      default:
        return priority;
    }
  };

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.PENDING:
        return 'bg-gray-100 text-gray-800';
      case TicketStatus.IN_PROGRESS:
        return 'bg-blue-100 text-blue-800';
      case TicketStatus.COMPLETED:
        return 'bg-green-100 text-green-800';
      case TicketStatus.FAILED:
        return 'bg-red-100 text-red-800';
      case TicketStatus.VERIFIED:
        return 'bg-emerald-100 text-emerald-800';
      case TicketStatus.VERIFICATION_FAILED:
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: TicketPriority) => {
    switch (priority) {
      case TicketPriority.LOW:
        return 'bg-green-100 text-green-800';
      case TicketPriority.MEDIUM:
        return 'bg-blue-100 text-blue-800';
      case TicketPriority.HIGH:
        return 'bg-orange-100 text-orange-800';
      case TicketPriority.URGENT:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, search: e.target.value }));
  };

  const filteredTickets = tickets.filter((ticket) => {
    if (filters.status && ticket.status !== filters.status) return false;
    if (filters.priority && ticket.priority !== filters.priority) return false;
    if (
      filters.search &&
      !ticket.title.toLowerCase().includes(filters.search.toLowerCase())
    )
      return false;
    return true;
  });

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
            href="/tickets/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            新增工單
          </Link>
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
              {filteredTickets.length > 0 ? (
                filteredTickets.map((ticket) => (
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
                          <div className="ml-2 flex-shrink-0 flex">
                            <p
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                                ticket.status
                              )}`}
                            >
                              {getStatusText(ticket.status)}
                            </p>
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
        </div>
      </div>
    </>
  );
}
