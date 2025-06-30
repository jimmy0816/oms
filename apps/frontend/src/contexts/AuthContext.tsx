import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import authService, { User } from '../services/authService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoggedIn: () => boolean;
  hasRole: (role: string) => boolean;
  isAdmin: () => boolean;
}

// 創建認證上下文
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 認證提供者組件
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 初始化時檢查用戶是否已登入
  // 使用 useEffect 確保只在客戶端執行
  useEffect(() => {
    // 確保只在客戶端執行
    if (typeof window !== 'undefined') {
      const initAuth = () => {
        const currentUser = authService.getCurrentUser();
        setUser(currentUser);
        setLoading(false);
      };

      initAuth();
    }
  }, []);

  // 登入方法
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await authService.login({ email, password });
      setUser(response.user);
    } finally {
      setLoading(false);
    }
  };

  // 登出方法
  const logout = () => {
    authService.logout();
    setUser(null);
    router.push('/login');
  };

  // 檢查是否已登入
  const isLoggedIn = () => {
    return authService.isLoggedIn();
  };

  // 檢查是否有特定角色
  const hasRole = (role: string) => {
    return authService.hasRole(role);
  };

  // 檢查是否為管理員
  const isAdmin = () => {
    return authService.isAdmin();
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isLoggedIn,
    hasRole,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 自定義鉤子，用於訪問認證上下文
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// 受保護的路由組件
export const ProtectedRoute: React.FC<{
  children: ReactNode;
  requiredRole?: string;
}> = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // 確保只在客戶端執行且加載完成
    if (typeof window !== 'undefined' && !loading) {
      // 如果未登入，重定向到登入頁面
      if (!user) {
        router.push('/login');
        return;
      }

      // 如果需要特定角色但用戶沒有該角色，重定向到首頁
      if (requiredRole && user.role !== requiredRole) {
        router.push('/');
      }
    }
  }, [loading, user, requiredRole, router]);

  // 在加載狀態或未通過驗證時顯示加載中
  if (loading || !user || (requiredRole && user.role !== requiredRole)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthContext;
