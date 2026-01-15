/**
 * Frontend Configuration
 * Environment variables and app settings
 */

export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3001',
  webUrl: process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3002',
  nodeEnv: process.env.NODE_ENV || 'development',
};
