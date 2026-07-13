import { Router } from 'express';
import { analytics, auditLogs, budgets, exportReport, notifications, policies, travels, workflows } from '../controllers/generic.controller.js';
import { authenticate, requireRoles } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/permission.middleware.js';
import { enforceTenant } from '../middleware/tenant.middleware.js';

export const platformRoutes = Router();

platformRoutes.use(authenticate, enforceTenant);
platformRoutes.get('/analytics', requirePermission('analytics', 'view'), analytics);
platformRoutes.get('/audit', requireRoles('company_admin', 'finance', 'cfo', 'super_admin'), requirePermission('audit_logs', 'view'), auditLogs);
platformRoutes.get('/notifications', requirePermission('notifications', 'view'), notifications);
platformRoutes.get('/reports/export/:format', requireRoles('company_admin', 'finance', 'super_admin', 'cfo'), requirePermission('expense_reports', 'export'), exportReport);

for (const [base, config] of Object.entries({
  budgets: { controller: budgets, page: 'budgets' },
  policies: { controller: policies, page: 'policies' },
  travels: { controller: travels, page: 'trips' },
  workflows: { controller: workflows, page: 'approval_workflow' }
})) {
  platformRoutes.get(`/${base}`, requirePermission(config.page, 'view'), config.controller.list);
  platformRoutes.post(`/${base}`, requireRoles('company_admin', 'finance', 'super_admin'), requirePermission(config.page, 'create'), config.controller.create);
  platformRoutes.patch(`/${base}/:id`, requireRoles('company_admin', 'finance', 'super_admin'), requirePermission(config.page, 'edit'), config.controller.update);
  platformRoutes.delete(`/${base}/:id`, requireRoles('company_admin', 'super_admin'), requirePermission(config.page, 'delete'), config.controller.remove);
}
