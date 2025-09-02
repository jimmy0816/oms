import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { signIn } from 'next-auth/react';

const LoginPage: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth(); // Only need user to check if already logged in
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const [isLoginInProgress, setIsLoginInProgress] = useState(false);

  // Redirect if already logged in, but not while a login is in progress
  useEffect(() => {
    if (user && !isLoginInProgress) {
      const { callbackUrl } = router.query;
      router.push((callbackUrl as string) || '/');
    }
  }, [user, router, isLoginInProgress, router.query]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // Clear previous errors
    setLoading(true);
    setIsLoginInProgress(true); // Signal that a login process has started

    try {
      if (!email || !password) {
        showToast('請輸入電子郵件和密碼', 'error');
        setLoading(false);
        setIsLoginInProgress(false); // Reset on validation failure
        return;
      }

      // Directly use next-auth's signIn for credentials
      // We set redirect: false to handle the redirect manually after checking result.
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        showToast(result.error, 'error');
        setIsLoginInProgress(false); // Reset on auth failure
      } else if (result?.ok) {
        // If signIn is successful, manually redirect to the callbackUrl or home.
        // The useEffect is blocked by isLoginInProgress=true, so no race condition.
        const { callbackUrl } = router.query;
        router.push((callbackUrl as string) || '/');
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : '登入失敗，請檢查您的憑證',
        'error'
      );
      setIsLoginInProgress(false); // Reset on unexpected error
    } finally {
      setLoading(false);
    }
  };

  const handleOidcLogin = () => {
    setLoading(true);
    setIsLoginInProgress(true); // Also signal for OIDC login
    const { callbackUrl } = router.query;
    // Let next-auth automatically handle the callbackUrl from the query string.
    signIn('oidc', {
      callbackUrl:
        (callbackUrl as string) || `${process.env.NEXT_PUBLIC_BASE_URL}`,
    }).catch((err) => {
      showToast(err instanceof Error ? err.message : 'OIDC 登入失敗', 'error');
      setLoading(false);
      setIsLoginInProgress(false);
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            系統登入
          </h2>
        </div>

        {error && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
            role="alert"
          >
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handlePasswordLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                電子郵件
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="電子郵件"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                密碼
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="密碼"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '登入中...' : '登入'}
            </button>
          </div>
        </form>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="flex-shrink mx-4 text-gray-400">或</span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>

        <div>
          <button
            type="button"
            onClick={handleOidcLogin}
            disabled={loading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gray-700 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '處理中...' : '使用 Thehapp 帳號登入'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
