import React, { useEffect, useState } from 'react';
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
  const [isAuthorized, setIsAuthorized] = useState(false); // 新增狀態來追蹤是否已授權渲染子組件

  useEffect(() => {
    console.log(
      'protected route effect:',
      'loading:',
      loading,
      'user:',
      user ? 'present' : 'null',
      'hasPermission:',
      hasPermission(requiredPermission),
      'current path:',
      router.asPath
    );

    if (typeof window === 'undefined') {
      // 服務器端渲染，此處不執行任何操作。
      return;
    }

    if (loading) {
      // 仍在加載身份驗證狀態，等待。
      setIsAuthorized(false); // 確保在加載時未授權
      return;
    }

    if (!user) {
      console.log('Redirecting to login: User not authenticated');
      router.push('/login');
      setIsAuthorized(false); // 未授權，將重定向
      return;
    }

    if (!hasPermission(requiredPermission)) {
      console.log('Redirecting to home: Insufficient permissions');
      router.push('/'); // 考慮導向到一個 403 (Forbidden) 頁面，而不是首頁
      setIsAuthorized(false); // 未授權，將重定向
      return;
    }

    // 如果執行到這裡，表示用戶已驗證並擁有權限。
    setIsAuthorized(true);
  }, [loading, user, requiredPermission, hasPermission, router]);

  // 如果尚未授權，則顯示加載指示器。
  // 這涵蓋了身份驗證仍在加載或重定向待處理的情況。
  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">權限驗證中...</p>
        </div>
      </div>
    );
  }

  // 如果已授權，則渲染子組件。
  return <>{children}</>;
};

export default ProtectedRoute;
