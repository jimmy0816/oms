import 'react-datepicker/dist/react-datepicker.css';
import '@/styles/react-datepicker-theme.css';
import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { Layout } from '@/components/Layout';
import { useEffect } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import ProtectedRoute from '@/components/ProtectedRoute'; // Import ProtectedRoute
import { routePermissions } from '@/config/routes'; // Import routePermissions
import { useRouter } from 'next/router'; // Import useRouter
import { Permission } from 'shared-types'; // Import Permission enum

import { SessionProvider } from 'next-auth/react';

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps) {
  const router = useRouter();

  // Get the required permission for the current route from our configuration
  const requiredPermission = routePermissions[router.pathname] as
    | Permission
    | undefined;

  // Check if the current route is the login page (which should not be protected)
  const isLoginPage = router.pathname === '/login';

  // Determine if the route needs protection
  const needsProtection = requiredPermission !== undefined && !isLoginPage;

  // Force a client-side render to ensure styles are applied
  useEffect(() => {
    // 確保 Tailwind 樣式被正確應用
    document.documentElement.classList.add('tailwind-ready');
  }, []);

  return (
    <SessionProvider session={session}>
      <AuthProvider>
        <ToastProvider>
          <Layout>
            {needsProtection ? (
              <ProtectedRoute requiredPermission={requiredPermission!}>
                <Component {...pageProps} />
              </ProtectedRoute>
            ) : (
              <Component {...pageProps} />
            )}
          </Layout>
        </ToastProvider>
      </AuthProvider>
    </SessionProvider>
  );
}
