import { asyncHandler } from '../helpers/asyncHandler.js';
import { ApiError } from '../helpers/apiError.js';
import {
  buildFinanceDashboard,
  createAccountingExport,
  financeVerifyReport,
  listAccountingExports,
  listCompliance,
  listErpIntegrations,
  listExpenseVerification,
  listFraudQueue,
  listPaymentTransactions,
  listReimbursements,
  processReimbursementPayment,
  pushExportToErp,
  retryFailedPayment,
  upsertErpIntegration,
  validateReportTaxes
} from '../services/finance.service.js';
import { AuditLog } from '../models/AuditLog.js';

export const financeDashboard = asyncHandler(async (req, res) => res.json(await buildFinanceDashboard({ req })));

export const expenseVerification = asyncHandler(async (req, res) => res.json(await listExpenseVerification({ req, query: req.query })));

export const verifyReport = asyncHandler(async (req, res) => {
  const report = await financeVerifyReport({ req, reportId: req.body.reportId, action: req.body.action, note: req.body.note });
  if (!report) throw new ApiError(404, 'Report not found');
  res.json(report);
});

export const taxValidation = asyncHandler(async (req, res) => {
  const validations = await validateReportTaxes({ req, reportId: req.params.reportId });
  if (!validations) throw new ApiError(404, 'Report not found');
  res.json(validations);
});

export const reimbursements = asyncHandler(async (req, res) => res.json(await listReimbursements({ req, query: req.query })));

export const processPayment = asyncHandler(async (req, res) => {
  const reimbursement = await processReimbursementPayment({ req, id: req.params.id, ...req.body });
  if (!reimbursement) throw new ApiError(404, 'Reimbursement not found');
  res.json(reimbursement);
});

export const retryPayment = asyncHandler(async (req, res) => {
  const reimbursement = await retryFailedPayment({ req, id: req.params.id, reference: req.body.reference });
  if (!reimbursement) throw new ApiError(404, 'Failed reimbursement not found');
  res.json(reimbursement);
});

export const paymentTracking = asyncHandler(async (req, res) => res.json(await listPaymentTransactions({ req })));

export const fraudDetection = asyncHandler(async (req, res) => res.json(await listFraudQueue({ req })));

export const complianceMonitoring = asyncHandler(async (req, res) => res.json(await listCompliance({ req })));

export const auditLogs = asyncHandler(async (req, res) => res.json(await AuditLog.find({ companyId: req.companyId }).sort({ createdAt: -1 }).limit(200)));

export const accountingExports = asyncHandler(async (req, res) => res.json(await listAccountingExports({ req })));

export const generateAccountingExport = asyncHandler(async (req, res) => {
  const { exportDoc, payload, contentType } = await createAccountingExport({ req, format: req.query.format || 'csv', erpTarget: req.query.erpTarget });
  res.header('X-Export-Id', exportDoc._id.toString());
  res.header('Content-Type', contentType);
  res.attachment(`accounting-${exportDoc.exportNo}.${exportDoc.format}`);
  res.send(payload);
});

export const erpIntegrations = asyncHandler(async (req, res) => res.json(await listErpIntegrations({ req })));

export const saveErpIntegration = asyncHandler(async (req, res) => res.status(201).json(await upsertErpIntegration({ req, payload: req.body })));

export const pushAccountingExport = asyncHandler(async (req, res) => {
  const result = await pushExportToErp({ req, id: req.params.id });
  if (!result) throw new ApiError(404, 'Accounting export not found');
  res.json(result);
});
