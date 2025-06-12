import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { Layout } from '@/components/Layout';
import { useEffect } from 'react';

export default function App({ Component, pageProps }: AppProps) {
  // Force a client-side render to ensure styles are applied
  useEffect(() => {
    // This is just to trigger a re-render on the client side
    const updateBodyClass = () => {
      if (document.body.className.indexOf('tailwind-loaded') === -1) {
        document.body.className += ' tailwind-loaded';
      }
    };
    updateBodyClass();
  }, []);

  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}
