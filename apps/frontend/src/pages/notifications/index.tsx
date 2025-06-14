import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { BellIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function NotificationsPage() {
  // In a real app, these would be fetched from the API
  const [notifications, setNotifications] = useState([
    { 
      id: '1', 
      title: 'New ticket assigned', 
      message: 'You have been assigned to ticket "System login issue"',
      isRead: false, 
      createdAt: '2025-06-10T08:30:00Z',
      relatedTicketId: '1'
    },
    { 
      id: '2', 
      title: 'Ticket status updated', 
      message: 'Ticket "Report generation failing" status changed to IN_PROGRESS',
      isRead: true, 
      createdAt: '2025-06-09T16:45:00Z',
      relatedTicketId: '2'
    },
    { 
      id: '3', 
      title: 'New comment on your ticket', 
      message: 'Mike Johnson commented on "User permission problem"',
      isRead: false, 
      createdAt: '2025-06-09T11:20:00Z',
      relatedTicketId: '3'
    },
    { 
      id: '4', 
      title: 'Ticket resolved', 
      message: 'Ticket "Database connection error" has been resolved',
      isRead: true, 
      createdAt: '2025-06-08T14:10:00Z',
      relatedTicketId: '4'
    },
    { 
      id: '5', 
      title: 'Ticket closed', 
      message: 'Ticket "Email notifications not sending" has been closed',
      isRead: true, 
      createdAt: '2025-06-07T09:30:00Z',
      relatedTicketId: '5'
    },
  ]);

  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(notification => 
      notification.id === id ? { ...notification, isRead: true } : notification
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(notification => ({ ...notification, isRead: true })));
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.isRead;
    if (filter === 'read') return notification.isRead;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <>
      <Head>
        <title>Notifications | OMS Prototype</title>
        <meta name="description" content="View notifications in the OMS Prototype" />
      </Head>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {unreadCount} unread
              </span>
            )}
          </h1>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
            >
              <CheckCircleIcon className="h-5 w-5 mr-2 text-gray-500" />
              Mark all as read
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex space-x-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                filter === 'all'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                filter === 'unread'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              Unread
            </button>
            <button
              onClick={() => setFilter('read')}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                filter === 'read'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              Read
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notification) => (
                <li key={notification.id} className={notification.isRead ? 'bg-white' : 'bg-blue-50'}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {!notification.isRead && (
                          <span className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-600 mr-2" />
                        )}
                        <p className={`text-sm font-medium ${notification.isRead ? 'text-gray-900' : 'text-blue-600'}`}>
                          {notification.title}
                        </p>
                      </div>
                      <div className="ml-2 flex-shrink-0 flex">
                        {!notification.isRead && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">
                        {notification.message}
                      </p>
                    </div>
                    <div className="mt-2 flex justify-between">
                      <div className="flex items-center text-sm text-gray-500">
                        <BellIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        <p>
                          <time dateTime={notification.createdAt}>{formatDate(notification.createdAt)}</time>
                        </p>
                      </div>
                      {notification.relatedTicketId && (
                        <Link href={`/tickets/${notification.relatedTicketId}`} className="text-sm font-medium text-blue-600 hover:text-blue-500">
                          View ticket
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              ))
            ) : (
              <li className="px-4 py-6 text-center text-gray-500">
                No notifications found.
              </li>
            )}
          </ul>
        </div>
      </div>
    </>
  );
}
