/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@car-service/shared', '@car-service/ui'],
  experimental: {
    appDir: true,
  },
};

module.exports = nextConfig;
