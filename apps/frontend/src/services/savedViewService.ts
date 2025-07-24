import axios from 'axios';
import { SavedView } from 'shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const getAuthHeaders = (): HeadersInit => {
  if (typeof window === 'undefined')
    return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('auth_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

export const savedViewService = {
  async getAllSavedViews(type: 'REPORT' | 'TICKET'): Promise<SavedView[]> {
    const response = await axios.get(`${API_URL}/api/saved-views`, {
      headers: getAuthHeaders(),
      params: { type },
    });
    return response.data.data;
  },

  async createSavedView(
    name: string,
    filters: any,
    type: 'REPORT' | 'TICKET'
  ): Promise<SavedView> {
    const response = await axios.post(
      `${API_URL}/api/saved-views`,
      { name, filters, type },
      {
        headers: getAuthHeaders(),
      }
    );
    return response.data.data;
  },

  async getSavedViewById(id: string): Promise<SavedView> {
    const response = await axios.get(`${API_URL}/api/saved-views/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data.data;
  },

  async updateSavedView(id: string, name: string, filters: any): Promise<SavedView> {
    const response = await axios.put(
      `${API_URL}/api/saved-views/${id}`,
      { name, filters },
      {
        headers: getAuthHeaders(),
      }
    );
    return response.data.data;
  },

  async deleteSavedView(id: string): Promise<void> {
    await axios.delete(`${API_URL}/api/saved-views/${id}`, {
      headers: getAuthHeaders(),
    });
  },
};
