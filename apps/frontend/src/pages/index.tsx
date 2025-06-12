import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { 
  TicketIcon, 
  BellIcon, 
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

export default function Home() {
  // 在實際應用中，這些數據將從 API 獲取
  const stats = [
    { name: '工單總數', value: '42', icon: ClipboardDocumentListIcon, color: 'bg-blue-500' },
    { name: '待處理工單', value: '12', icon: ClockIcon, color: 'bg-yellow-500' },
    { name: '今日已解決', value: '8', icon: CheckCircleIcon, color: 'bg-green-500' },
    { name: '緊急工單', value: '3', icon: ExclamationCircleIcon, color: 'bg-red-500' },
  ];

  // 模擬最近工單
  const recentTickets = [
    { id: '1', title: '系統登入問題', status: '待處理', priority: '高', createdAt: '2025-06-09T10:30:00Z', assignee: '李小明' },
    { id: '2', title: '報表生成失敗', status: '處理中', priority: '中', createdAt: '2025-06-08T14:20:00Z', assignee: '王大華' },
    { id: '3', title: '使用者權限問題', status: '待處理', priority: '低', createdAt: '2025-06-07T09:15:00Z', assignee: '張小芳' },
  ];

  // 模擬最近通知
  const recentNotifications = [
    { id: '1', title: '新工單已指派給您', isRead: false, createdAt: '2025-06-10T08:30:00Z', type: '工單' },
    { id: '2', title: '工單狀態已更新', isRead: true, createdAt: '2025-06-09T16:45:00Z', type: '更新' },
    { id: '3', title: '您的工單有新留言', isRead: false, createdAt: '2025-06-09T11:20:00Z', type: '留言' },
  ];
  
  // 模擬系統概況
  const systemStats = [
    { name: '活躍使用者', value: '24', icon: UserGroupIcon, change: '+12%', isPositive: true },
    { name: '本月工單', value: '156', icon: ClipboardDocumentListIcon, change: '+8%', isPositive: true },
    { name: '平均處理時間', value: '4.2小時', icon: ClockIcon, change: '-15%', isPositive: true },
    { name: '客戶滿意度', value: '94%', icon: ChartBarIcon, change: '+2%', isPositive: true },
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });
  };
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '待處理':
        return 'bg-yellow-100 text-yellow-800';
      case '處理中':
        return 'bg-blue-100 text-blue-800';
      case '已解決':
        return 'bg-green-100 text-green-800';
      case '已關閉':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case '低':
        return 'bg-green-100 text-green-800';
      case '中':
        return 'bg-blue-100 text-blue-800';
      case '高':
        return 'bg-orange-100 text-orange-800';
      case '緊急':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getNotificationTypeIcon = (type: string) => {
    switch (type) {
      case '工單':
        return <ClipboardDocumentListIcon className="h-4 w-4 text-blue-500" />;
      case '更新':
        return <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />;
      case '留言':
        return <BellIcon className="h-4 w-4 text-yellow-500" />;
      default:
        return <BellIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <>
      <Head>
        <title>OMS 原型 - 儀表板</title>
      </Head>
      <div className="space-y-6">
        {/* 歡迎區塊 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">歡迎回來，管理員</h1>
          <p className="text-gray-600">以下是您的系統概況和最近活動。</p>
        </div>

        {/* 系統概況卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {systemStats.map((stat) => (
            <div key={stat.name} className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                  <p className="text-2xl font-bold mt-1 text-gray-900">{stat.value}</p>
                </div>
                <div className="p-2 rounded-lg bg-blue-50">
                  <stat.icon className="h-5 w-5 text-blue-500" />
                </div>
              </div>
              <div className="mt-3 flex items-center">
                <span className={`text-xs font-medium ${stat.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.change}
                </span>
                <span className="text-xs text-gray-500 ml-1">與上月相比</span>
              </div>
            </div>
          ))}
        </div>

        {/* 工單統計卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-8">
          {stats.map((stat) => (
            <div key={stat.name} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
              <div className="p-5">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 p-2 rounded-md ${stat.color}`}>
                    <stat.icon className="w-5 h-5 text-white" aria-hidden="true" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-2 border-t border-gray-100">
                <Link href="/tickets" className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center">
                  查看詳情
                  <svg className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mt-8">
          {/* 最近工單 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-lg font-medium text-gray-900">最近工單</h2>
              <Link href="/tickets" className="text-sm font-medium text-blue-600 hover:text-blue-800">
                查看全部
              </Link>
            </div>
            <div className="divide-y divide-gray-100">
              {recentTickets.map((ticket) => (
                <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="block hover:bg-gray-50 transition-colors">
                  <div className="px-5 py-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">{ticket.title}</p>
                      <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${getStatusColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                        <span className="text-xs text-gray-500">负責人: {ticket.assignee}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(ticket.createdAt)}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="bg-gray-50 px-5 py-3 text-center border-t border-gray-100">
              <Link href="/tickets/new" className="text-sm font-medium text-blue-600 hover:text-blue-800">
                建立新工單
              </Link>
            </div>
          </div>

          {/* 最近通知 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-lg font-medium text-gray-900">最近通知</h2>
              <Link href="/notifications" className="text-sm font-medium text-blue-600 hover:text-blue-800">
                查看全部
              </Link>
            </div>
            <div className="divide-y divide-gray-100">
              {recentNotifications.map((notification) => (
                <Link key={notification.id} href={`/notifications/${notification.id}`} className="block hover:bg-gray-50 transition-colors">
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-full bg-gray-50">
                        {getNotificationTypeIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium ${notification.isRead ? 'text-gray-700' : 'text-gray-900'} truncate`}>
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(notification.createdAt)} {formatTime(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="bg-gray-50 px-5 py-3 text-center border-t border-gray-100">
              <button className="text-sm font-medium text-blue-600 hover:text-blue-800">
                標記全部已讀
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
