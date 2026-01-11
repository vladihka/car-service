import dotenv from 'dotenv';

dotenv.config();

// Export typed config object matching the structure expected by the application
export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  apiUrl: process.env.API_URL || 'http://localhost:3001',
  
  mongodb: {
    uri: process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/car-service',
  },
  
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'default-secret-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  
  superadmin: {
    email: process.env.SUPERADMIN_EMAIL || 'admin@example.com',
    password: process.env.SUPERADMIN_PASSWORD || 'SuperAdmin123!',
  },
  
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
      : [
          process.env.WEB_URL || 'http://localhost:3002',
          process.env.ADMIN_URL || 'http://localhost:3003',
        ].filter(Boolean),
  },
  
  webUrl: process.env.WEB_URL || 'http://localhost:3002',
  adminUrl: process.env.ADMIN_URL || 'http://localhost:3003',
};

export default config;
