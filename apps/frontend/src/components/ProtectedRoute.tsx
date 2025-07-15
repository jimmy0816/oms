import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from 'shared-types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole[];
}

/**
 * 受保護的路由組件
 * 用於限制未登入用戶訪問特定頁面
 * 可選擇性地要求特定角色
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
}) => {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    // 確保只在客戶端執行且加載完成
    if (typeof window !== 'undefined' && !loading) {
      // 如果未登入，重定向到登入頁面
      if (!user) {
        router.push('/login');
        return;
      }

      // 如果需要特定角色但用戶沒有該角色，重定向到首頁
      if (requiredRole && !requiredRole.includes(user.role as UserRole)) {
        router.push('/');
      }
    }
  }, [loading, user, requiredRole, router]);

  // 在加載狀態或未通過驗證時顯示加載中
  if (
    loading ||
    !user ||
    (requiredRole && !requiredRole.includes(user.role as UserRole))
  ) {
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

export default ProtectedRoute;
