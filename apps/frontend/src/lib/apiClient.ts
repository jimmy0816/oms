import authService from '@/services/authService';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * 處理 API 回應的通用函式
 * @param response - Fetch API 的 Response 物件
 * @returns - 解析後的 JSON 資料
 */
async function handleResponse(response: Response) {
  // 如果回應狀態碼是 401 (Unauthorized)，表示 token 失效
  if (response.status === 401) {
    // 呼叫 logout，這會清除本地存儲和 cookie，並重定向到登入頁
    authService.logout();
    // 拋出一個錯誤，中斷當前的 promise chain
    return Promise.reject(new Error('Session expired. Please log in again.'));
  }

  const data = await response.json();

  if (!response.ok) {
    // 從後端回應中提取錯誤訊息
    const error = (data && data.error) || response.statusText;
    return Promise.reject(new Error(error));
  }

  // 如果後端格式包含 { success: boolean, data: ... }，則只回傳 data 部分
  if (data && typeof data.success === 'boolean' && 'data' in data) {
    return data.data;
  }

  return data;
}

/**
 * 封裝的 API Client
 */
const apiClient = {
  async get<T>(path: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${API_URL}${path}`);
    if (params) {
      Object.keys(params).forEach((key) =>
        url.searchParams.append(key, params[key])
      );
    }

    const token = authService.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
    });

    return handleResponse(response);
  },

  async post<T>(path: string, body: any): Promise<T> {
    const token = authService.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    return handleResponse(response);
  },

  async put<T>(path: string, body: any): Promise<T> {
    const token = authService.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${path}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });

    return handleResponse(response);
  },

  async delete<T>(path: string): Promise<T> {
    const token = authService.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${path}`, {
      method: 'DELETE',
      headers,
    });

    return handleResponse(response);
  },
};

export default apiClient;
