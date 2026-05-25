import { Router } from 'express';
import {
  accountingExports,
  auditLogs,
  complianceMonitoring,
  erpIntegrations,
  expenseVerification,
  financeDashboard,
  fraudDetection,
  generateAccountingExport,
  paymentTracking,
  processPayment,
  pushAccountingExport,
  reimbursements,
  retryPayment,
  saveErpIntegration,
  taxValidation,
  verifyReport
} from '../controllers/finance.controller.js';
import { authenticate, requireRoles } from '../middleware/auth.middleware.js';
import { enforceTenant } from '../middleware/tenant.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { erpIntegrationSchema, financeVerificationSchema, reimbursementProcessSchema, retryPaymentSchema } from '../validators/finance.validator.js';

export const financeRoutes = Router();

financeRoutes.use(authenticate, enforceTenant, requireRoles('finance', 'cfo', 'company_admin', 'super_admin'));

financeRoutes.get('/dashboard', financeDashboard);
financeRoutes.get('/verification', expenseVerification);
financeRoutes.post('/verification/action', validate(financeVerificationSchema), verifyReport);
financeRoutes.post('/tax/:reportId/validate', taxValidation);
financeRoutes.get('/reimbursements', reimbursements);
financeRoutes.post('/reimbursements/:id/process', validate(reimbursementProcessSchema), processPayment);
financeRoutes.post('/reimbursements/:id/retry', validate(retryPaymentSchema), retryPayment);
financeRoutes.get('/payments', paymentTracking);
financeRoutes.get('/fraud', fraudDetection);
financeRoutes.get('/compliance', complianceMonitoring);
financeRoutes.get('/audit-logs', auditLogs);
financeRoutes.get('/accounting/exports', accountingExports);
financeRoutes.get('/accounting/export', generateAccountingExport);
financeRoutes.get('/erp-integrations', erpIntegrations);
financeRoutes.post('/erp-integrations', validate(erpIntegrationSchema), saveErpIntegration);
financeRoutes.post('/accounting/exports/:id/push', pushAccountingExport);
