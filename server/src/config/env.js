import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: process.env.PORT || 1000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gt_expense_management',
  jwtSecret: process.env.JWT_SECRET || 'GTEXPENCESECRET',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'GTEXPENCEREFRESHSECRET',
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
