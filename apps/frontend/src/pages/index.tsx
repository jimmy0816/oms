import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router'; // Import useRouter
import {
  TicketIcon,
  BellIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import {
  dashboardService,
  DashboardMetrics,
} from '@/services/dashboardService';
import {
  Ticket,
  TicketStatus,
  TicketPriority,
  Permission,
  Notification,
} from 'shared-types';
import {
  getStatusText,
  getPriorityText,
  getStatusColor,
  getPriorityColor,
} from '@/services/ticketService';

export default function Home() {
  const { user, loading: authLoading } = useAuth(); // Get auth loading state
  const router = useRouter(); // Initialize useRouter
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<
    Notification[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      // If auth is not loading and user is not logged in, redirect to login
      router.push('/login');
      return;
    }

    if (user) {
      const fetchDashboardData = async () => {
        try {
          setLoading(true);
          const metricsData = await dashboardService.getDashboardMetrics();
          setMetrics(metricsData);

          const ticketsData = await dashboardService.getRecentTickets();
          setRecentTickets(ticketsData);

          const notificationsData =
            await dashboardService.getRecentNotifications();
          setRecentNotifications(notificationsData);
        } catch (err: any) {
          setError(err.message || 'Failed to fetch dashboard data');
        } finally {
          setLoading(false);
        }
      };

      fetchDashboardData();
    }
  }, [user, authLoading, router]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <>
      <Head>
        <title>OMS 原型 - 儀表板</title>
      </Head>
      <div className="space-y-6">
        {/* 歡迎區塊 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            歡迎回來，{user?.name || '訪客'}
          </h1>
          <p className="text-gray-600">以下是您的系統概況和最近活動。</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-8">
            {[
              {
                name: '工單總數',
                value: metrics?.totalTickets || 0,
                icon: ClipboardDocumentListIcon,
                color: 'bg-blue-500',
              },
              {
                name: '待處理工單',
                value: metrics?.pendingTickets || 0,
                icon: ClockIcon,
                color: 'bg-yellow-500',
              },
              {
                name: '今日已解決',
                value: metrics?.resolvedTodayTickets || 0,
                icon: CheckCircleIcon,
                color: 'bg-green-500',
              },
              {
                name: '緊急工單',
                value: metrics?.urgentTickets || 0,
                icon: ExclamationCircleIcon,
                color: 'bg-red-500',
              },
            ].map((stat) => (
              <div
                key={stat.name}
                className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100"
              >
                <div className="p-5">
                  <div className="flex items-center">
                    <div
                      className={`flex-shrink-0 p-2 rounded-md ${stat.color}`}
                    >
                      <stat.icon
                        className="w-5 h-5 text-white"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">
                        {stat.name}
                      </p>
                      <p className="text-xl font-bold text-gray-900 mt-1">
                        {stat.value}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-5 py-2 border-t border-gray-100">
                  <Link
                    href="/tickets"
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center"
                  >
                    查看詳情
                    <svg
                      className="h-3 w-3 ml-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mt-8">
          {/* 最近工單 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-lg font-medium text-gray-900">最近工單</h2>
              <Link
                href="/tickets"
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                查看全部
              </Link>
            </div>
            <div className="divide-y divide-gray-100">
              {recentTickets.length > 0 ? (
                recentTickets.map((ticket) => (
                  <Link
                    key={ticket.id}
                    href={`/tickets/${ticket.id}`}
                    className="block hover:bg-gray-50 transition-colors"
                  >
                    <div className="px-5 py-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {ticket.title}
                        </p>
                        <span
                          className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${getStatusColor(
                            ticket.status
                          )}`}
                        >
                          {getStatusText(ticket.status)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityColor(
                              ticket.priority
                            )}`}
                          >
                            {getPriorityText(ticket.priority)}
                          </span>
                          <span className="text-xs text-gray-500">
                            負責人: {ticket.assignee?.name || '未指派'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(ticket.createdAt)}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="px-5 py-4 text-center text-gray-500">
                  沒有最近工單。
                </div>
              )}
            </div>
            {user?.permissions?.includes(Permission.CREATE_TICKETS) && (
              <div className="bg-gray-50 px-5 py-3 text-center border-t border-gray-100">
                <Link
                  href="/tickets/new"
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  建立新工單
                </Link>
              </div>
            )}
          </div>

          {/* 最近通知 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-lg font-medium text-gray-900">最近通知</h2>
              <Link
                href="/notifications"
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                查看全部
              </Link>
            </div>
            <div className="divide-y divide-gray-100 flex-grow">
              {recentNotifications.length > 0 ? (
                recentNotifications.map((notification) => (
                  <Link
                    key={notification.id}
                    href={`/notifications/${notification.id}`}
                    className="block hover:bg-gray-50 transition-colors"
                  >
                    <div className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-full bg-gray-50">
                          <BellIcon className="h-4 w-4 text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p
                              className={`text-sm font-medium ${
                                notification.isRead
                                  ? 'text-gray-700'
                                  : 'text-gray-900'
                              } truncate`}
                            >
                              {notification.title}
                            </p>
                            {!notification.isRead && (
                              <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="px-5 py-4 text-center text-gray-500">
                  沒有最近通知。
                </div>
              )}
            </div>
            <div className="bg-gray-50 px-5 py-3 text-center border-t border-gray-100">
              <Link
                href="/notifications"
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                查看全部
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
