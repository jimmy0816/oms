import Cookies from 'js-cookie';
// Fix the import path to resolve the module not found error
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  additionalRoles?: string[];
  permissions?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginResponse {
  user: User;
  token: string;
}

/**
 * 認證服務
 * 處理登入、登出和權限驗證
 */
const authService = {
  /**
   * 用戶登入
   * @param credentials 登入憑證
   * @returns 登入響應，包含用戶資訊和令牌
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '登入失敗');
      }

      const data = await response.json();

      if (!data.success || !data.data) {
        throw new Error('登入響應格式錯誤');
      }

      // 解析日期字段
      const user = {
        ...data.data.user,
        createdAt: new Date(data.data.user.createdAt),
        updatedAt: new Date(data.data.user.updatedAt),
        permissions: data.data.user.permissions || [],
      };

      // 保存令牌到本地存儲和 Cookie
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', data.data.token);
        localStorage.setItem('user_info', JSON.stringify(user));
        Cookies.set('token', data.data.token, { expires: 7, path: '/' }); // 設置 cookie，有效期 7 天
      }

      return {
        user,
        token: data.data.token,
      };
    } catch (error) {
      console.error('登入失敗:', error);
      throw error;
    }
  },

  /**
   * 登出用戶
   */
  logout(): void {
    console.log('authService logout called');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_info');
      Cookies.remove('token', { path: '/' }); // 移除 cookie
      // 可以在這裡添加重定向到登入頁面的邏輯
      // window.location.href = '/login';
    }
  },

  /**
   * 獲取當前登入的用戶
   * @returns 當前用戶或 null
   */
  getCurrentUser(): User | null {
    if (typeof window === 'undefined') {
      return null;
    }

    // 首先檢查 Cookie 中是否有 token。如果沒有，則認為未登入。
    if (!this.getToken()) {
      return null;
    }

    const userJson = localStorage.getItem('user_info');
    if (!userJson) return null;

    try {
      const user = JSON.parse(userJson);
      return {
        ...user,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt),
        permissions: user.permissions || [],
      };
    } catch (error) {
      console.error('解析用戶資訊失敗:', error);
    }
    return null;
  },

  /**
   * 獲取存儲的令牌
   */
  getToken(): string | null {
    if (typeof window !== 'undefined') {
      // 改為從 Cookie 讀取 token，使其與 middleware 的驗證標準一致
      return Cookies.get('token') || null;
    }
    return null;
  },

  /**
   * 檢查用戶是否已登入
   * @returns 是否已登入
   */
  isLoggedIn(): boolean {
    return !!this.getToken();
  },

  /**
   * 檢查用戶是否有特定角色
   * @param role 角色名稱
   * @returns 是否有該角色
   */
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;

    // 檢查主要角色
    if (user.role === role) return true;

    // 檢查額外角色
    return user.additionalRoles ? user.additionalRoles.includes(role) : false;
  },

  /**
   * 檢查用戶是否有管理員權限
   * @returns 是否為管理員
   */
  isAdmin(): boolean {
    return this.hasRole('ADMIN');
  },
};

export default authService;
