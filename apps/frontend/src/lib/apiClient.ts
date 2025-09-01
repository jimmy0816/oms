import { signOut } from 'next-auth/react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

async function handleResponse(response: Response) {
  if (response.status === 401) {
    // const frontendLogoutUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/login`;
    // await signOut({ redirect: false });
    // window.location.href = frontendLogoutUrl;
  }

  if (response.status === 204) {
    return null;
  }

  const data = await response.json();

  if (!response.ok) {
    const error = (data && data.error) || response.statusText;
    return Promise.reject(new Error(error));
  }

  if (data && typeof data.success === 'boolean' && 'data' in data) {
    return data.data;
  }

  return data;
}

const apiClient = {
  async get<T>(path: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${API_URL}${path}`);
    if (params) {
      Object.keys(params).forEach((key) =>
        url.searchParams.append(key, params[key])
      );
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies in cross-origin requests
    });

    return handleResponse(response);
  },

  async post<T>(
    path: string,
    body: any,
    options: { responseType?: 'blob'; headers?: Record<string, string> } = {}
  ): Promise<T> {
    const headers = options.headers || {
      'Content-Type': 'application/json',
    };

    const response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      credentials: 'include', // Include cookies in cross-origin requests
    });

    if (options.responseType === 'blob') {
      if (!response.ok) {
        return Promise.reject(new Error('Failed to download file'));
      }
      return response.blob() as Promise<T>;
    }

    return handleResponse(response);
  },

  async put<T>(path: string, body: any): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      credentials: 'include', // Include cookies in cross-origin requests
    });

    return handleResponse(response);
  },

  async patch<T>(path: string, body: any): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      credentials: 'include', // Include cookies in cross-origin requests
    });

    return handleResponse(response);
  },

  async delete<T>(path: string): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies in cross-origin requests
    });

    return handleResponse(response);
  },
};

export default apiClient;
