import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { Permission } from 'shared-types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission: Permission;
}

/**
 * 新的受保護路由組件
 * 根據用戶是否擁有特定權限來限制頁面訪問
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
}) => {
  const router = useRouter();
  const { user, loading, hasPermission } = useAuth();

  useEffect(() => {
    if (typeof window !== 'undefined' && !loading) {
      if (!user) {
        router.push('/login');
        return;
      }

      if (!hasPermission(requiredPermission)) {
        // 可以導向到一個 403 (Forbidden) 頁面或首頁
        router.push('/');
      }
    }
  }, [loading, user, requiredPermission, hasPermission, router]);

  if (loading || !user || !hasPermission(requiredPermission)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">權限驗證中...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
