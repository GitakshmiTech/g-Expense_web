import { Router } from 'express';
import { runEnterpriseAnalytics } from '../controllers/enterpriseAnalytics.controller.js';
import { authenticate, requireRoles } from '../middleware/auth.middleware.js';
import { enforceTenant } from '../middleware/tenant.middleware.js';

export const enterpriseAnalyticsRoutes = Router();

enterpriseAnalyticsRoutes.use(authenticate, enforceTenant, requireRoles('company_admin', 'manager', 'finance', 'cfo', 'super_admin'));
enterpriseAnalyticsRoutes.get('/:report', runEnterpriseAnalytics);
