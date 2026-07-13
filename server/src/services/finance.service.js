import { stringify } from 'csv-stringify/sync';
import { writeAudit } from '../audit/audit.service.js';
import { AuditLog } from '../models/AuditLog.js';
import { Expense, Receipt } from '../models/Expense.js';
import {
  AccountingExport,
  ErpIntegration,
  ExpenseReport,
  OcrLog,
  PaymentTransaction,
  Reimbursement,
  TaxValidation
} from '../models/Enterprise.js';
import { detectFraud } from './fraud.service.js';
import { enqueueNotification } from '../jobs/queue.js';
import { TravelRequest } from '../models/ExpenseEcosystem.js';

export const buildFinanceDashboard = async ({ req }) => {
  const [verificationQueue, travelQueue, reimbursements, failedPayments, taxIssues, fraudQueue, exports] = await Promise.all([
    ExpenseReport.find({ companyId: req.companyId, status: { $in: ['manager_approved', 'submitted'] } }).populate('employeeId', 'name email department').sort({ createdAt: -1 }),
    TravelRequest.find({ companyId: req.companyId, status: { $in: ['PENDING_FINANCE', 'PENDING_CFO'] } }).populate('employeeId', 'name email department').sort({ createdAt: -1 }),
    Reimbursement.find({ companyId: req.companyId }).populate('employeeId', 'name email department').populate('reportId', 'title status').sort({ createdAt: -1 }),
    PaymentTransaction.find({ companyId: req.companyId, status: 'failed' }).populate('reimbursementId').sort({ createdAt: -1 }),
    TaxValidation.find({ companyId: req.companyId, status: { $in: ['mismatch', 'missing_tax_id'] } }).populate('expenseId').sort({ createdAt: -1 }),
    Expense.find({ companyId: req.companyId, $or: [{ 'fraudFlags.0': { $exists: true } }, { 'policyViolations.0': { $exists: true } }] }).populate('employeeId', 'name email department').sort({ createdAt: -1 }),
    AccountingExport.find({ companyId: req.companyId }).sort({ createdAt: -1 }).limit(10)
  ]);

  return {
    cards: {
      verificationQueue: verificationQueue.length + travelQueue.length,
      pendingReimbursement: reimbursements.filter((item) => ['pending', 'processing'].includes(item.status)).reduce((sum, item) => sum + item.amount, 0),
      failedPayments: failedPayments.length,
      taxIssues: taxIssues.length,
      suspiciousExpenses: fraudQueue.length
    },
    verificationQueue: [
      ...verificationQueue,
      ...travelQueue.map((trip) => ({ ...trip.toObject(), kind: 'trip', amount: trip.budget?.amount || trip.estimate?.estimatedTotal || 0, currency: trip.budget?.currency || 'INR' }))
    ],
    reimbursements,
    failedPayments,
    taxIssues,
    fraudQueue,
    exports
  };
};

export const listExpenseVerification = async ({ req, query }) => {
  const filter = { companyId: req.companyId };
  if (query.status) filter.status = query.status;
  else filter.status = { $in: ['manager_approved', 'submitted', 'PENDING_FINANCE', 'PENDING_ACCOUNTS', 'UNDER_VERIFICATION', 'PAYMENT_PROCESSING', 'finance_review', 'cfo_review', 'finance_verified', 'sent_back', 'rejected'] };

  const [reports, expenses, trips] = await Promise.all([
    ExpenseReport.find({ ...filter, status: { $in: ['manager_approved', 'submitted', 'finance_verified', 'sent_back', 'rejected'] } })
      .populate('employeeId', 'name email department')
      .populate('expenses')
      .sort({ createdAt: -1 }),
    Expense.find({ companyId: req.companyId, status: { $in: ['PENDING_FINANCE', 'PENDING_ACCOUNTS', 'UNDER_VERIFICATION', 'PAYMENT_PROCESSING', 'finance_review', 'cfo_review'] } })
      .populate('employeeId', 'name email department')
      .sort({ createdAt: -1 }),
    TravelRequest.find({ companyId: req.companyId, status: { $in: ['PENDING_FINANCE', 'PENDING_CFO'] } })
      .populate('employeeId', 'name email department managerId')
      .sort({ createdAt: -1 })
  ]);

  return [
    ...expenses.map((item) => ({ ...item.toObject(), kind: 'expense' })),
    ...reports.map((item) => ({ ...item.toObject(), kind: 'report' })),
    ...trips.map((item) => {
      const obj = item.toObject();
      return {
        ...obj,
        kind: 'trip',
        amount: obj.budget?.amount || obj.estimate?.estimatedTotal || 0,
        estimatedCost: obj.budget?.amount || obj.estimate?.estimatedTotal || 0,
        currency: obj.budget?.currency || 'INR'
      };
    })
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

export const validateReportTaxes = async ({ req, reportId }) => {
  const report = await ExpenseReport.findOne({ _id: reportId, companyId: req.companyId }).populate('expenses');
  if (!report) return null;
  const validations = [];
  for (const expense of report.expenses) {
    validations.push(await validateExpenseTax({ req, expense, report }));
  }
  await writeAudit({ req, action: 'finance.tax.validate_report', entity: 'ExpenseReport', entityId: report._id.toString(), after: { validations: validations.map((item) => item.toObject()) } });
  return validations;
};

export const validateExpenseTax = async ({ req, expense, report }) => {
  const taxType = expense.currency === 'INR' ? 'GST' : 'VAT';
  const taxId = extractTaxId(expense.description);
  const taxableAmount = Number(expense.amount || 0) - Number(expense.taxAmount || 0);
  const expectedRate = taxType === 'GST' ? 0.18 : 0.2;
  const expectedTaxAmount = Math.round(taxableAmount * expectedRate);
  const actualTax = Number(expense.taxAmount || 0);
  const findings = [];
  let status = 'valid';

  if (!actualTax) {
    status = 'not_applicable';
  } else if (!taxId) {
    status = 'missing_tax_id';
    findings.push({ code: `${taxType}_ID_MISSING`, message: `${taxType} registration number is missing`, severity: 'warning' });
  } else if (Math.abs(actualTax - expectedTaxAmount) > Math.max(5, expectedTaxAmount * 0.05)) {
    status = 'mismatch';
    findings.push({ code: `${taxType}_MISMATCH`, message: `${taxType} amount does not match expected tax`, severity: 'block' });
  }

  return TaxValidation.findOneAndUpdate(
    { companyId: req.companyId, expenseId: expense._id },
    {
      companyId: req.companyId,
      expenseId: expense._id,
      reportId: report?._id,
      taxType,
      taxId,
      taxableAmount,
      taxAmount: actualTax,
      expectedTaxAmount,
      status,
      findings,
      updatedBy: req.user._id,
      createdBy: req.user._id
    },
    { new: true, upsert: true }
  );
};

export const financeVerifyReport = async ({ req, reportId, action, note }) => {
  const report = await ExpenseReport.findOne({ _id: reportId, companyId: req.companyId }).populate('expenses');
  if (!report) return null;
  const before = report.toObject();
  const taxValidations = await validateReportTaxes({ req, reportId });
  const hasTaxBlock = taxValidations.some((item) => item.status === 'mismatch');
  const hasHardViolation = report.expenses.some((expense) => expense.policyViolations?.some((violation) => violation.severity === 'block'));

  if (action === 'verify' && (hasTaxBlock || hasHardViolation)) report.status = 'sent_back';
  else if (action === 'verify') report.status = 'finance_verified';
  else if (action === 'reject') report.status = 'rejected';
  else if (action === 'send_back') report.status = 'sent_back';
  report.updatedBy = req.user._id;
  await report.save();

  if (report.status === 'finance_verified') {
    await Reimbursement.findOneAndUpdate(
      { companyId: req.companyId, reportId: report._id },
      { companyId: req.companyId, reportId: report._id, employeeId: report.employeeId, amount: report.totalAmount, currency: report.currency, status: 'pending', method: 'bank_transfer', createdBy: req.user._id, updatedBy: req.user._id },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  }
  await enqueueNotification({ companyId: req.companyId, userId: report.employeeId, title: `Finance ${report.status}`, message: note || `Finance marked report as ${report.status}`, category: 'approval', data: { kind: 'report', reportId: report._id, status: report.status, actorId: req.user._id } });
  await writeAudit({ req, action: `finance.report.${action}`, entity: 'ExpenseReport', entityId: report._id.toString(), before, after: report.toObject(), metadata: { taxValidations: taxValidations.length } });
  return report;
};

export const listReimbursements = ({ req, query }) => {
  const filter = { companyId: req.companyId };
  if (query.status) filter.status = query.status;
  return Reimbursement.find(filter).populate('employeeId', 'name email department').populate('reportId', 'title status').sort({ createdAt: -1 });
};

export const processReimbursementPayment = async ({ req, id, status, reference, failureReason }) => {
  const reimbursement = await Reimbursement.findOne({ _id: id, companyId: req.companyId });
  if (!reimbursement) return null;
  const before = reimbursement.toObject();
  reimbursement.status = status;
  reimbursement.reference = reference || reimbursement.reference || `PAY-${Date.now()}`;
  reimbursement.failureReason = failureReason;
  reimbursement.lastAttemptAt = new Date();
  reimbursement.updatedBy = req.user._id;
  if (status === 'failed') reimbursement.retryCount += 1;
  if (status === 'paid') reimbursement.paidAt = new Date();
  await reimbursement.save();

  await PaymentTransaction.create({
    companyId: req.companyId,
    reimbursementId: reimbursement._id,
    amount: reimbursement.amount,
    currency: reimbursement.currency,
    reference: reimbursement.reference,
    status,
    failureReason,
    retryCount: reimbursement.retryCount,
    processedAt: ['paid', 'failed'].includes(status) ? new Date() : undefined,
    createdBy: req.user._id,
    updatedBy: req.user._id
  });
  if (status === 'paid' && reimbursement.reportId) {
    await ExpenseReport.findOneAndUpdate({ _id: reimbursement.reportId, companyId: req.companyId }, { status: 'reimbursed', updatedBy: req.user._id });
    const report = await ExpenseReport.findOne({ _id: reimbursement.reportId, companyId: req.companyId }).select('expenses');
    if (report?.expenses?.length) {
      await Expense.updateMany({ _id: { $in: report.expenses }, companyId: req.companyId }, { status: 'REIMBURSED', updatedBy: req.user._id });
    }
  }
  if (status === 'paid' && reimbursement.expenseId) {
    await Expense.findOneAndUpdate({ _id: reimbursement.expenseId, companyId: req.companyId }, { status: 'REIMBURSED', updatedBy: req.user._id });
  }
  await enqueueNotification({
    companyId: req.companyId,
    userId: reimbursement.employeeId,
    title: status === 'paid' ? 'Reimbursement paid' : `Payment ${status}`,
    message: status === 'paid' ? `Your reimbursement of ${reimbursement.amount} ${reimbursement.currency} has been paid.` : `Your reimbursement payment is ${status}.`,
    category: 'expense',
    data: { kind: 'reimbursement', reimbursementId: reimbursement._id, status, actorId: req.user._id }
  });
  await writeAudit({ req, action: `finance.payment.${status}`, entity: 'Reimbursement', entityId: reimbursement._id.toString(), before, after: reimbursement.toObject() });
  return reimbursement;
};

export const retryFailedPayment = async ({ req, id, reference }) => {
  const reimbursement = await Reimbursement.findOne({ _id: id, companyId: req.companyId, status: 'failed' });
  if (!reimbursement) return null;
  reimbursement.status = 'processing';
  reimbursement.retryCount += 1;
  reimbursement.reference = reference || reimbursement.reference || `RETRY-${Date.now()}`;
  reimbursement.lastAttemptAt = new Date();
  reimbursement.failureReason = undefined;
  await reimbursement.save();
  await PaymentTransaction.create({ companyId: req.companyId, reimbursementId: reimbursement._id, amount: reimbursement.amount, currency: reimbursement.currency, reference: reimbursement.reference, status: 'retrying', retryCount: reimbursement.retryCount, createdBy: req.user._id, updatedBy: req.user._id });
  await writeAudit({ req, action: 'finance.payment.retry', entity: 'Reimbursement', entityId: reimbursement._id.toString(), after: reimbursement.toObject() });
  return reimbursement;
};

export const listPaymentTransactions = ({ req }) => PaymentTransaction.find({ companyId: req.companyId }).populate('reimbursementId').sort({ createdAt: -1 });

export const listFraudQueue = async ({ req }) => {
  const expenses = await Expense.find({ companyId: req.companyId }).populate('employeeId', 'name email department').sort({ createdAt: -1 });
  for (const expense of expenses) {
    expense.fraudFlags = await detectFraud({ companyId: req.companyId, expense });
    await expense.save();
  }
  return expenses.filter((expense) => expense.fraudFlags.length || expense.policyViolations.length);
};

export const listCompliance = async ({ req }) => {
  const [taxIssues, duplicateReceipts, auditLogs, failedPayments] = await Promise.all([
    TaxValidation.find({ companyId: req.companyId, status: { $in: ['mismatch', 'missing_tax_id'] } }).populate('expenseId').sort({ createdAt: -1 }),
    OcrLog.find({ companyId: req.companyId, duplicateScore: { $gte: 70 } }).populate('expenseId receiptId').sort({ createdAt: -1 }),
    AuditLog.find({ companyId: req.companyId }).sort({ createdAt: -1 }).limit(100),
    PaymentTransaction.find({ companyId: req.companyId, status: 'failed' }).sort({ createdAt: -1 })
  ]);
  return { taxIssues, duplicateReceipts, auditLogs, failedPayments };
};

export const createAccountingExport = async ({ req, format = 'csv', erpTarget }) => {
  const reimbursements = await Reimbursement.find({ companyId: req.companyId, status: 'paid' }).populate('employeeId', 'name email department').lean();
  const rows = reimbursements.map((item) => ({
    date: item.paidAt,
    employee: item.employeeId?.name,
    department: item.employeeId?.department,
    amount: item.amount,
    currency: item.currency,
    method: item.method,
    reference: item.reference,
    ledger: 'Employee Reimbursements'
  }));
  const exportDoc = await AccountingExport.create({
    companyId: req.companyId,
    exportNo: `EXP-${Date.now()}`,
    format,
    erpTarget,
    recordCount: rows.length,
    totalAmount: rows.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    createdBy: req.user._id,
    updatedBy: req.user._id
  });
  const payload = format === 'json' ? JSON.stringify(rows, null, 2) : stringify(rows, { header: true });
  await writeAudit({ req, action: 'finance.accounting_export.generate', entity: 'AccountingExport', entityId: exportDoc._id.toString(), after: exportDoc.toObject() });
  return { exportDoc, payload, contentType: format === 'json' ? 'application/json' : 'text/csv' };
};

export const listAccountingExports = ({ req }) => AccountingExport.find({ companyId: req.companyId }).sort({ createdAt: -1 });

export const upsertErpIntegration = async ({ req, payload }) => {
  const integration = await ErpIntegration.findOneAndUpdate(
    { companyId: req.companyId, provider: payload.provider },
    { ...payload, companyId: req.companyId },
    { new: true, upsert: true }
  );
  await writeAudit({ req, action: 'finance.erp.upsert', entity: 'ErpIntegration', entityId: integration._id.toString(), after: integration.toObject() });
  return integration;
};

export const listErpIntegrations = ({ req }) => ErpIntegration.find({ companyId: req.companyId }).sort({ createdAt: -1 });

export const pushExportToErp = async ({ req, id }) => {
  const exportDoc = await AccountingExport.findOne({ _id: id, companyId: req.companyId });
  if (!exportDoc) return null;
  const integration = await ErpIntegration.findOne({ companyId: req.companyId, active: true, provider: exportDoc.erpTarget || 'custom' });
  exportDoc.status = integration ? 'pushed' : 'failed';
  exportDoc.error = integration ? undefined : 'No active ERP integration configured';
  await exportDoc.save();
  await writeAudit({ req, action: 'finance.erp.push_export', entity: 'AccountingExport', entityId: exportDoc._id.toString(), after: exportDoc.toObject(), metadata: { provider: integration?.provider } });
  return exportDoc;
};

const extractTaxId = (text = '') => {
  const match = String(text).match(/[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]/i);
  return match?.[0]?.toUpperCase();
};
