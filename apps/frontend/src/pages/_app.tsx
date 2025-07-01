import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { Layout } from '@/components/Layout';
import { useEffect } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';

export default function App({ Component, pageProps }: AppProps) {
  // Force a client-side render to ensure styles are applied
  useEffect(() => {
    // 確保 Tailwind 樣式被正確應用
    document.documentElement.classList.add('tailwind-ready');
  }, []);

  return (
    <AuthProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </AuthProvider>
  );
}
