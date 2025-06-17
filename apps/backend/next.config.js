/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["shared-types", "prisma-client"],
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"]
  }
};

// Export the configuration
module.exports = nextConfig;
