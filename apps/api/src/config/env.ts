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

  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    sandbox: process.env.EMAIL_SANDBOX === 'true' || process.env.NODE_ENV === 'development',
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || process.env.EMAIL_FROM || 'noreply@car-service.com',
    retryAttempts: parseInt(process.env.EMAIL_RETRY_ATTEMPTS || '3', 10),
    retryDelayMs: parseInt(process.env.EMAIL_RETRY_DELAY_MS || '1000', 10),
  },

  push: {
    enabled: process.env.PUSH_ENABLED === 'true',
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
    vapidSubject: process.env.VAPID_SUBJECT || process.env.API_URL || 'mailto:noreply@car-service.com',
    maxFailureCount: parseInt(process.env.PUSH_MAX_FAILURE_COUNT || '5', 10),
    retryAttempts: parseInt(process.env.PUSH_RETRY_ATTEMPTS || '3', 10),
  },
};

// Валидация конфигурации email при запуске
if (config.email.enabled && !config.email.sandbox) {
  if (!config.email.host || !config.email.user || !config.email.pass) {
    throw new Error('Email configuration is incomplete. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.');
  }
}

// Валидация конфигурации push при запуске
if (config.push.enabled) {
  if (!config.push.vapidPublicKey || !config.push.vapidPrivateKey) {
    throw new Error('Push configuration is incomplete. Please set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables. Generate keys using: npx web-push generate-vapid-keys');
  }
}

export default config;
