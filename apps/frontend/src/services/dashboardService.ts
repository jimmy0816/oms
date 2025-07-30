import { ApiResponse, Ticket, Notification } from 'shared-types';
import apiClient from '@/lib/apiClient';



export const dashboardService = {
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    try {
      return await apiClient.get<DashboardMetrics>('/api/dashboard/metrics');
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      throw error;
    }
  },

  async getRecentTickets(): Promise<Ticket[]> {
    try {
      const tickets = await apiClient.get<Ticket[]>('/api/dashboard/recent-tickets');
      return tickets.map((ticket) => ({
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
      const notifications = await apiClient.get<Notification[]>('/api/dashboard/recent-notifications');
      return notifications.map((notification) => ({
        ...notification,
        createdAt: new Date(notification.createdAt),
      }));
    } catch (error) {
      console.error('Error fetching recent notifications:', error);
      throw error;
    }
  },
};
