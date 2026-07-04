import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';
import { rejectNoSqlOperators } from './middleware/sanitize.middleware.js';
import { authRoutes } from './routes/auth.routes.js';
import { companyRoutes } from './routes/company.routes.js';
import { expenseRoutes } from './routes/expense.routes.js';
import { enterpriseRoutes } from './routes/enterprise.routes.js';
import { platformRoutes } from './routes/platform.routes.js';
import { rbacRoutes } from './routes/rbac.routes.js';
import { userRoutes } from './routes/user.routes.js';
import { workflowRoutes } from './routes/workflow.routes.js';
import { managerRoutes } from './routes/manager.routes.js';
import { financeRoutes } from './routes/finance.routes.js';
import { enterpriseAnalyticsRoutes } from './routes/enterpriseAnalytics.routes.js';
import { categoryRoutes } from './routes/category.routes.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

app.set('trust proxy', 1); // Trust first proxy (like Nginx/Cloudflare) to fix express-rate-limit X-Forwarded-For error
app.use(helmet());
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rejectNoSqlOperators);
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 1000 }));
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

app.get('/health', (req, res) => res.json({ ok: true, service: 'GT Expense Management API' }));
app.use('/api/auth', authRoutes);
app.use('/api/company-admin/rbac', rbacRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/enterprise', enterpriseRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/enterprise-analytics', enterpriseAnalyticsRoutes);
app.use('/api/expense-categories', categoryRoutes);
app.use('/api', platformRoutes);

const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

app.use(notFound);
app.use(errorHandler);
