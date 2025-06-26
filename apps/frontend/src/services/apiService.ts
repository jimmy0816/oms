import { getToken } from './authService';

// 動態決定 API URL
const API_URL = typeof window !== 'undefined'
  ? `http://${window.location.hostname}:3001/api`
  : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * API 服務 - 處理所有 API 請求的基礎功能
 */
export const apiService = {
  /**
   * 獲取 API URL
   */
  getApiUrl(): string {
    return API_URL;
  },

  /**
   * 獲取帶有授權標頭的請求選項
   */
  getAuthHeaders(): HeadersInit {
    const token = getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  },

  /**
   * 發送 GET 請求
   */
  async get<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    try {
      // 構建查詢參數
      const queryParams = new URLSearchParams(params);
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      
      const response = await fetch(`${API_URL}${endpoint}${queryString}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `請求失敗: ${response.status}`);
      }
      
      return data.data;
    } catch (error: any) {
      console.error(`GET 請求失敗 (${endpoint}):`, error);
      throw error;
    }
  },

  /**
   * 發送 POST 請求
   */
  async post<T>(endpoint: string, body: any): Promise<T> {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(body),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `請求失敗: ${response.status}`);
      }
      
      return data.data;
    } catch (error: any) {
      console.error(`POST 請求失敗 (${endpoint}):`, error);
      throw error;
    }
  },

  /**
   * 發送 PUT 請求
   */
  async put<T>(endpoint: string, body: any): Promise<T> {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(body),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `請求失敗: ${response.status}`);
      }
      
      return data.data;
    } catch (error: any) {
      console.error(`PUT 請求失敗 (${endpoint}):`, error);
      throw error;
    }
  },

  /**
   * 發送 DELETE 請求
   */
  async delete<T>(endpoint: string): Promise<T> {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `請求失敗: ${response.status}`);
      }
      
      return data.data;
    } catch (error: any) {
      console.error(`DELETE 請求失敗 (${endpoint}):`, error);
      throw error;
    }
  },
};

export default apiService;
