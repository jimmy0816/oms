import { User } from '@/types/user';

// 動態決定 API URL
const API_URL = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001/api`
  : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

console.log('API URL:', API_URL); // 添加日誌以便調試

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  name: string;
  password: string;
  role?: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: User;
    token: string;
  };
  error?: string;
}

/**
 * 用戶登入
 * @param credentials 登入憑證
 * @returns 登入結果
 */
export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || '登入失敗',
      };
    }

    // 儲存 token 到 localStorage
    if (data.data?.token) {
      localStorage.setItem('auth_token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
    }

    return data;
  } catch (error) {
    console.error('登入錯誤:', error);
    return {
      success: false,
      error: '登入過程中發生錯誤',
    };
  }
};

/**
 * 用戶註冊
 * @param userData 用戶資料
 * @returns 註冊結果
 */
export const register = async (userData: RegisterData): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || '註冊失敗',
      };
    }

    // 儲存 token 到 localStorage
    if (data.data?.token) {
      localStorage.setItem('auth_token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
    }

    return data;
  } catch (error) {
    console.error('註冊錯誤:', error);
    return {
      success: false,
      error: '註冊過程中發生錯誤',
    };
  }
};

/**
 * 登出
 * @returns 登出成功或失敗
 */
export const logout = (): boolean => {
  try {
    // 清除本地存储的认证信息
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    
    // 返回成功状态，让调用者决定如何处理导航
    // 而不是直接在这里修改 window.location
    return true;
  } catch (error) {
    console.error('登出错误:', error);
    return false;
  }
};

/**
 * 獲取當前登入用戶
 * @returns 當前用戶
 */
export const getCurrentUser = (): User | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    return null;
  }
  
  try {
    return JSON.parse(userStr);
  } catch (error) {
    console.error('解析用戶資料錯誤:', error);
    return null;
  }
};

/**
 * 獲取 JWT Token
 * @returns JWT Token
 */
export const getToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  
  return localStorage.getItem('auth_token');
};

/**
 * 檢查用戶是否已登入
 * @returns 是否已登入
 */
export const isAuthenticated = (): boolean => {
  return !!getToken();
};

/**
 * 檢查用戶是否有特定角色
 * @param role 角色
 * @returns 是否有該角色
 */
export const hasRole = (role: string): boolean => {
  const user = getCurrentUser();
  if (!user) {
    return false;
  }
  
  // 檢查主要角色
  if (user.role === role) {
    return true;
  }
  
  // 檢查額外角色
  if (user.additionalRoles && Array.isArray(user.additionalRoles)) {
    return user.additionalRoles.includes(role);
  }
  
  return false;
};
