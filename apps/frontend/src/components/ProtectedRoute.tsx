import { useEffect, ReactNode, useState } from 'react';
import { useRouter } from 'next/router';
import { isAuthenticated } from '@/services/authService';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * 路由保護組件
 * 用於確保只有已登入的用戶才能訪問受保護的頁面
 */
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    // Mark component as mounted to avoid hydration mismatch
    setMounted(true);
    
    // 檢查用戶是否已登入
    if (typeof window !== 'undefined') {
      const isLoggedIn = isAuthenticated();
      const isLoginPage = router.pathname === '/login';
      
      // 如果未登入且不在登入頁面，則重定向到登入頁面
      if (!isLoggedIn && !isLoginPage) {
        router.push('/login');
      }
      
      // 如果已登入且在登入頁面，則重定向到首頁
      // 但只在路由已準備好時進行，避免過早重定向
      if (isLoggedIn && isLoginPage && router.isReady) {
        router.push('/');
      }
    }
  }, [router, router.isReady]);

  // During server-side rendering or before hydration, just render children
  // This prevents hydration mismatch between server and client
  if (!mounted) {
    return <>{children}</>;
  }
  
  // Client-side only checks below this point
  
  // 如果在登入頁面，直接顯示內容
  if (router.pathname === '/login') {
    return <>{children}</>;
  }

  // 如果未登入，不顯示任何內容（等待重定向）
  if (!isAuthenticated()) {
    return null;
  }

  // 已登入，顯示受保護的內容
  return <>{children}</>;
};
