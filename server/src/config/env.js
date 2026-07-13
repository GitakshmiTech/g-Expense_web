import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: process.env.PORT || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gt_expense_management',
  jwtSecret: process.env.JWT_SECRET || 'GTEXPENCESECRET',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'GTEXPENCEREFRESHSECRET',
  integration: {
    serviceToken: process.env.INTEGRATION_SERVICE_TOKEN || process.env.ASSET_EXPENSE_INTEGRATION_TOKEN || 'asset-expense-dev-token',
    assetApiBaseUrl: process.env.ASSET_API_BASE_URL || 'http://localhost:7000/api',
    defaultCompanyId: process.env.INTEGRATION_DEFAULT_COMPANY_ID || '',
    defaultUserEmail: process.env.INTEGRATION_DEFAULT_USER_EMAIL || ''
  },
  superAdminEmail: process.env.SUPER_ADMIN_EMAIL || 'gtexpence@gmail.com',
  superAdminPassword: process.env.SUPER_ADMIN_PASSWORD || 'admin123',
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT || 6379)
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  encryptionKey: process.env.ENCRYPTION_KEY || 'replace-with-32-byte-secret-value'
};
