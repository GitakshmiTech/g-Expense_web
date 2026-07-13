import { Router } from 'express';
import {
  actOnExpense,
  actionTravel,
  addExpenseComment,
  cloneExpense,
  closeExpense,
  createAdvance,
  createExpense,
  createExpenseReport,
  createSharedExpense,
  createTravel,
  calculateSharedSplit,
  estimateTravel,
  getExpense,
  getSharedExpenseDetails,
  getExpenseTimeline,
  listAdvanceRequests,
  listExpenseReports,
  listExpenses,
  listSharedExpenseParticipants,
  listTravelAssets,
  listTravelRequests,
  migrateSubmitted,
  processExpenseReimbursement,
  reimburseSharedExpense,
  scanReceiptOnly,
  settleAdvanceRequest,
  splitExpense,
  submitExpense,
  submitExpenseReport,
  submitSharedExpense,
  uploadReceipt,
  verifyFinance
} from '../controllers/expense.controller.js';
import { authenticate, requireRoles } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/permission.middleware.js';
import { enforceTenant } from '../middleware/tenant.middleware.js';
import { upload } from '../middleware/upload.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { expenseSchema } from '../validators/expense.validator.js';

export const expenseRoutes = Router();

expenseRoutes.use(authenticate, enforceTenant);
expenseRoutes.get('/', listExpenses);
expenseRoutes.post('/', validate(expenseSchema), createExpense);
expenseRoutes.post('/ocr', upload.single('receipt'), scanReceiptOnly);
expenseRoutes.post('/migrate-submitted', requireRoles('company_admin', 'super_admin'), migrateSubmitted);
expenseRoutes.post('/shared/create', validate(expenseSchema), createSharedExpense);
expenseRoutes.post('/shared/split', calculateSharedSplit);
expenseRoutes.post('/shared/submit', submitSharedExpense);
expenseRoutes.get('/shared/details', getSharedExpenseDetails);
expenseRoutes.get('/shared/participants', listSharedExpenseParticipants);
expenseRoutes.post('/shared/reimburse', requireRoles('finance', 'company_admin', 'super_admin'), reimburseSharedExpense);
expenseRoutes.get('/reports', listExpenseReports);
expenseRoutes.post('/reports', createExpenseReport);
expenseRoutes.post('/reports/:id/submit', submitExpenseReport);
expenseRoutes.get('/travel-requests', requirePermission('trips', 'view'), listTravelRequests);
expenseRoutes.get('/travel-assets', requirePermission('trips', 'create'), listTravelAssets);
expenseRoutes.post('/travel-requests/estimate', requirePermission('trips', 'view'), estimateTravel);
expenseRoutes.post('/travel-requests', requirePermission('trips', 'create'), createTravel);
expenseRoutes.post('/travel-requests/:id/action', requirePermission('trips', 'approve'), actionTravel);
expenseRoutes.get('/advance-requests', listAdvanceRequests);
expenseRoutes.post('/advance-requests', createAdvance);
expenseRoutes.post('/advance-requests/:id/settle', requireRoles('finance', 'company_admin', 'super_admin'), settleAdvanceRequest);
expenseRoutes.get('/:id', getExpense);
expenseRoutes.post('/:id/receipt', upload.single('receipt'), uploadReceipt);
expenseRoutes.post('/:id/submit', submitExpense);
expenseRoutes.post('/:id/action', requireRoles('manager', 'finance', 'cfo', 'company_admin'), actOnExpense);
expenseRoutes.post('/:id/clone', cloneExpense);
expenseRoutes.post('/:id/comments', addExpenseComment);
expenseRoutes.get('/:id/timeline', getExpenseTimeline);
expenseRoutes.post('/:id/split', splitExpense);
expenseRoutes.post('/:id/finance-verify', requireRoles('finance', 'company_admin', 'super_admin'), verifyFinance);
expenseRoutes.post('/:id/reimburse', requireRoles('finance', 'company_admin', 'super_admin'), processExpenseReimbursement);
expenseRoutes.post('/:id/close', requireRoles('finance', 'company_admin', 'super_admin'), closeExpense);
