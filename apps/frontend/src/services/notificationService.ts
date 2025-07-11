import { Notification } from 'shared-types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const getAuthHeaders = (): HeadersInit => {
  if (typeof window === 'undefined')
    return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('auth_token');
  const headeres: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headeres.Authorization = `Bearer ${token}`;
  }
  return headeres;
};

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
      const response = await fetch(`${API_BASE_URL}/api/notifications`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      const notifications = await response.json();
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
      const response = await fetch(
        `${API_BASE_URL}/api/notifications/${id}/read`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
        }
      );
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      const updatedNotification = await response.json();
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
      const response = await fetch(
        `${API_BASE_URL}/api/notifications/read-all`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
        }
      );
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return null;
    }
  },
};
