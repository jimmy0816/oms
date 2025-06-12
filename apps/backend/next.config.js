/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["shared-types", "prisma-client"],
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"]
  }
};

// Export with server configuration
module.exports = {
  ...nextConfig,
  // Change the port to 3002 to avoid conflicts
  devServer: {
    port: 3002,
  }
};
