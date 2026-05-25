import { Router } from 'express';
import {
  managerAnalytics,
  managerApprovalAction,
  managerBudgets,
  managerBulkApprovalAction,
  managerDashboard,
  managerExpenseDetails,
  managerNotifications,
  managerPendingApprovals,
  managerReports,
  managerTeamExpenses,
  managerTripAction,
  managerTrips,
  managerViolations
} from '../controllers/manager.controller.js';
import { authenticate, requireRoles } from '../middleware/auth.middleware.js';
import { enforceTenant } from '../middleware/tenant.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { managerActionSchema, managerBulkActionSchema } from '../validators/manager.validator.js';

export const managerRoutes = Router();

managerRoutes.use(authenticate, enforceTenant, requireRoles('manager', 'company_admin', 'super_admin'));

managerRoutes.get('/dashboard', managerDashboard);
managerRoutes.get('/team-expenses', managerTeamExpenses);
managerRoutes.get('/team-expenses/:id', managerExpenseDetails);
managerRoutes.get('/pending-approvals', managerPendingApprovals);
managerRoutes.post('/approvals/action', validate(managerActionSchema), managerApprovalAction);
managerRoutes.post('/approvals/bulk', validate(managerBulkActionSchema), managerBulkApprovalAction);
managerRoutes.get('/reports', managerReports);
managerRoutes.get('/trips', managerTrips);
managerRoutes.post('/trips/:id/action', managerTripAction);
managerRoutes.get('/budgets', managerBudgets);
managerRoutes.get('/violations', managerViolations);
managerRoutes.get('/analytics', managerAnalytics);
managerRoutes.get('/notifications', managerNotifications);
