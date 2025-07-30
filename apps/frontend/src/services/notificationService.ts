import { Notification } from 'shared-types';
import apiClient from '@/lib/apiClient';



/**
 * Notification management service
 * Communicates with the backend API for notifications.
 */
export const notificationService = {
  /**
   * Fetches all notifications for the current user.
   * Requires authentication, so a valid token must be sent by the browser.
   * @returns A list of notifications.
   */
  async getNotifications(): Promise<Notification[]> {
    try {
      const notifications = await apiClient.get<Notification[]>('/api/notifications');
      return notifications.map((n: any) => ({
        ...n,
        createdAt: new Date(n.createdAt),
      }));
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  },

  /**
   * Marks a single notification as read.
   * @param id - The ID of the notification to mark as read.
   * @returns The updated notification.
   */
  async markAsRead(id: string): Promise<Notification | null> {
    try {
      const updatedNotification = await apiClient.post<Notification>(
        `/api/notifications/${id}/read`,
        {}
      );
      return {
        ...updatedNotification,
        createdAt: new Date(updatedNotification.createdAt),
      };
    } catch (error) {
      console.error(`Error marking notification ${id} as read:`, error);
      return null;
    }
  },

  /**
   * Marks all unread notifications for the current user as read.
   * @returns An object with a message indicating success.
   */
  async markAllAsRead(): Promise<{ message: string } | null> {
    try {
      return await apiClient.post<{ message: string }>(
        '/api/notifications/read-all',
        {}
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return null;
    }
  },
};
