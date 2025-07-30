import apiClient from '@/lib/apiClient';
import { SavedView } from 'shared-types';



export const savedViewService = {
  async getAllSavedViews(viewType: 'REPORT' | 'TICKET'): Promise<SavedView[]> {
    return apiClient.get<SavedView[]>('/api/saved-views', { viewType });
  },

  async createSavedView(
    name: string,
    filters: any,
    viewType: 'REPORT' | 'TICKET',
    isDefault: boolean = false
  ): Promise<SavedView> {
    return apiClient.post<SavedView>('/api/saved-views', { name, filters, viewType, isDefault });
  },

  async getSavedViewById(id: string): Promise<SavedView> {
    return apiClient.get<SavedView>(`/api/saved-views/${id}`);
  },

  async updateSavedView(id: string, name: string, filters: any, isDefault?: boolean): Promise<SavedView> {
    return apiClient.put<SavedView>(`/api/saved-views/${id}`, { name, filters, isDefault });
  },

  async deleteSavedView(id: string): Promise<void> {
    await apiClient.delete<void>(`/api/saved-views/${id}`);
  },

  async setDefaultSavedView(id: string, viewType: 'REPORT' | 'TICKET'): Promise<SavedView> {
    return apiClient.put<SavedView>(`/api/saved-views/${id}/set-default`, { viewType });
  },
};
