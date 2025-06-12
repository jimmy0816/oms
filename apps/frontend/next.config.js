/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["shared-types"],
  // 根據環境變量選擇輸出模式
  ...(process.env.NEXT_RUNTIME === 'edge' ? {
    output: 'standalone', // 獨立模式用於 Edge Runtime
    experimental: {
      runtime: 'edge',
    },
  } : process.env.NODE_ENV === 'production' ? {
    output: 'export', // 靜態導出用於 GitHub Pages
    images: {
      unoptimized: true, // 靜態導出需要
    },
    basePath: '/oms-prototype',
  } : {}),
  // 確保 CSS 模塊正確處理
  webpack: (config) => {
    return config;
  },
};

module.exports = nextConfig;
