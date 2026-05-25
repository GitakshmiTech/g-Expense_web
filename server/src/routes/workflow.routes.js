import { Router } from 'express';
import {
  accountingExport,
  createReport,
  financeActionReport,
  listApprovalHistory,
  listReimbursements,
  listReports,
  listViolations,
  managerActionReport,
  processReimbursement,
  submitReport,
  workflowDashboard
} from '../controllers/workflow.controller.js';
import { authenticate, requireRoles } from '../middleware/auth.middleware.js';
import { enforceTenant } from '../middleware/tenant.middleware.js';

export const workflowRoutes = Router();

workflowRoutes.use(authenticate, enforceTenant);

workflowRoutes.get('/manager/dashboard', requireRoles('manager', 'company_admin', 'super_admin'), workflowDashboard('manager'));
workflowRoutes.get('/finance/dashboard', requireRoles('finance', 'cfo', 'company_admin', 'super_admin'), workflowDashboard('finance'));
workflowRoutes.get('/reports', listReports);
workflowRoutes.post('/reports', createReport);
workflowRoutes.post('/reports/:id/submit', submitReport);
workflowRoutes.post('/reports/:id/manager-action', requireRoles('manager', 'company_admin', 'super_admin'), managerActionReport);
workflowRoutes.post('/reports/:id/finance-action', requireRoles('finance', 'cfo', 'company_admin', 'super_admin'), financeActionReport);
workflowRoutes.get('/reimbursements', requireRoles('finance', 'cfo', 'company_admin', 'super_admin'), listReimbursements);
workflowRoutes.post('/reimbursements/:id/process', requireRoles('finance', 'cfo', 'company_admin', 'super_admin'), processReimbursement);
workflowRoutes.get('/violations', requireRoles('manager', 'finance', 'cfo', 'company_admin', 'super_admin'), listViolations);
workflowRoutes.get('/approvals/history', requireRoles('manager', 'finance', 'cfo', 'company_admin', 'super_admin'), listApprovalHistory);
workflowRoutes.get('/accounting/export', requireRoles('finance', 'cfo', 'company_admin', 'super_admin'), accountingExport);
