const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@car-service/shared', '@car-service/ui'],
  webpack: (config, { isServer }) => {
    // Add alias for workspace packages
    config.resolve.alias = {
      ...config.resolve.alias,
      '@car-service/ui': path.resolve(__dirname, '../../packages/ui/src/index.ts'),
      '@car-service/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    };
    
    // Ensure .ts and .tsx extensions are resolved
    if (!config.resolve.extensions) {
      config.resolve.extensions = [];
    }
    config.resolve.extensions = [
      ...new Set([...config.resolve.extensions, '.ts', '.tsx', '.js', '.jsx']),
    ];
    
    return config;
  },
};

module.exports = nextConfig;
