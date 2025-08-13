import apiClient from '@/lib/apiClient';
import { Location } from 'shared-types';

export const locationService = {
  /**
   * 獲取所有空間列表，包含已啟用和未啟用的。
   * 用於管理頁面。
   */
  async getAllLocations(): Promise<Location[]> {
    return apiClient.get<Location[]>('/api/locations');
  },

  /**
   * 獲取所有已啟用的空間列表。
   * 用於篩選器。
   */
  async getActiveLocations(): Promise<Location[]> {
    return apiClient.get<Location[]>('/api/locations', { active: true });
  },

  /**
   * 創建新空間。
   */
  async createLocation(data: { name: string; externalId?: number }): Promise<Location> {
    return apiClient.post<Location>('/api/locations', data);
  },

  /**
   * 更新空間資訊。
   * 包含名稱、啟用狀態和排序。
   */
  async updateLocation(
    id: string,
    data: { name?: string; active?: boolean; sortOrder?: number }
  ): Promise<Location> {
    // Using PUT for full update, sending ID in body as per backend API
    return apiClient.put<Location>('/api/locations', { id, ...data });
  },

  /**
   * 刪除空間。
   */
  async deleteLocation(id: string): Promise<void> {
    // Using DELETE, sending ID in body as per backend API
    return apiClient.delete<void>('/api/locations', { id });
  },

  /**
   * 重新排序空間。
   */
  async reorderLocations(updates: { id: string; sortOrder: number }[]): Promise<void> {
    return apiClient.patch<void>('/api/locations', { updates });
  },
};

export default locationService;