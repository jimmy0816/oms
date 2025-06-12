/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["shared-types"],
  // 只在生產環境使用靜態導出
  ...(process.env.NODE_ENV === 'production' ? {
    output: 'export', // Static export for GitHub Pages
    images: {
      unoptimized: true, // Required for static export
    },
    basePath: '/oms-prototype',
  } : {}),
  // 確保 CSS 模塊正確處理
  webpack: (config) => {
    return config;
  },
};

module.exports = nextConfig;
