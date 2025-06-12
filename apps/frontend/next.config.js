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
  } : process.env.DOCKER_BUILD === 'true' ? {
    // Docker 構建時使用 standalone 模式，而不是靜態導出
    output: 'standalone',
    images: {
      unoptimized: true,
    },
  } : process.env.NODE_ENV === 'production' && !process.env.DOCKER_BUILD ? {
    output: 'export', // 靜態導出用於 GitHub Pages
    images: {
      unoptimized: true, // 靜態導出需要
    },
  } : {}),
  // 確保 CSS 模塊正確處理
  webpack: (config) => {
    return config;
  },
};

module.exports = nextConfig;
