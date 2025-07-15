import { ApiResponse, Ticket, Notification } from 'shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface DashboardMetrics {
  totalTickets: number;
  pendingTickets: number;
  resolvedTodayTickets: number;
  urgentTickets: number;
}

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

export const dashboardService = {
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    try {
      const response = await fetch(`${API_URL}/api/dashboard/metrics`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch dashboard metrics');
      }

      const result: ApiResponse<DashboardMetrics> = await response.json();
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch dashboard metrics');
      }
      return result.data;
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      throw error;
    }
  },

  async getRecentTickets(): Promise<Ticket[]> {
    try {
      const response = await fetch(`${API_URL}/api/dashboard/recent-tickets`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch recent tickets');
      }

      const result: ApiResponse<Ticket[]> = await response.json();
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch recent tickets');
      }
      return result.data.map((ticket) => ({
        ...ticket,
        createdAt: new Date(ticket.createdAt),
        updatedAt: new Date(ticket.updatedAt),
      }));
    } catch (error) {
      console.error('Error fetching recent tickets:', error);
      throw error;
    }
  },

  async getRecentNotifications(): Promise<Notification[]> {
    try {
      const response = await fetch(
        `${API_URL}/api/dashboard/recent-notifications`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || 'Failed to fetch recent notifications'
        );
      }

      const result: ApiResponse<Notification[]> = await response.json();
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch recent notifications');
      }
      return result.data.map((notification) => ({
        ...notification,
        createdAt: new Date(notification.createdAt),
      }));
    } catch (error) {
      console.error('Error fetching recent notifications:', error);
      throw error;
    }
  },
};
