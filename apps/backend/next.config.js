/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  transpilePackages: ["shared-types", "prisma-client"],
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"]
  },
  typescript: {
    // 禁用 TypeScript 類型檢查，以便在構建過程中忽略類型錯誤
    ignoreBuildErrors: true
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    return config;
  }
};

// Export the configuration
module.exports = nextConfig;
