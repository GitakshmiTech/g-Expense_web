import { asyncHandler } from '../helpers/asyncHandler.js';
import { ApiError } from '../helpers/apiError.js';
import { tenantFilter } from '../middleware/tenant.middleware.js';
import { Expense } from '../models/Expense.js';
import { Approval, ExpenseReport, Reimbursement } from '../models/Enterprise.js';
import {
  buildAccountingExport,
  buildWorkflowDashboard,
  createExpenseReport,
  financeVerifyReport,
  managerReviewReport,
  processPayment,
  submitExpenseReport
} from '../services/workflow.service.js';

export const workflowDashboard = (panel) => asyncHandler(async (req, res) => {
  res.json(await buildWorkflowDashboard({ companyId: req.companyId, user: req.user, panel }));
});

export const listReports = asyncHandler(async (req, res) => {
  const filter = tenantFilter(req);
  if (req.query.mine === 'true') filter.employeeId = req.user._id;
  if (req.query.status) filter.status = req.query.status;
  const reports = await ExpenseReport.find(filter).populate('employeeId', 'name email department').populate('expenses').sort({ createdAt: -1 });
  res.json(reports);
});

export const createReport = asyncHandler(async (req, res) => {
  const report = await createExpenseReport({ req, expenseIds: req.body.expenseIds || [], title: req.body.title });
  res.status(201).json(report);
});

export const submitReport = asyncHandler(async (req, res) => {
  const report = await ExpenseReport.findOne({ _id: req.params.id, ...tenantFilter(req) });
  if (!report) throw new ApiError(404, 'Report not found');
  if (!report.employeeId.equals(req.user._id)) throw new ApiError(403, 'Only report owner can submit');
  res.json(await submitExpenseReport({ req, report }));
});

export const managerActionReport = asyncHandler(async (req, res) => {
  const report = await ExpenseReport.findOne({ _id: req.params.id, ...tenantFilter(req) });
  if (!report) throw new ApiError(404, 'Report not found');
  res.json(await managerReviewReport({ req, report, action: req.body.action, note: req.body.note }));
});

export const financeActionReport = asyncHandler(async (req, res) => {
  const report = await ExpenseReport.findOne({ _id: req.params.id, ...tenantFilter(req) });
  if (!report) throw new ApiError(404, 'Report not found');
  res.json(await financeVerifyReport({ req, report, action: req.body.action, note: req.body.note }));
});

export const listReimbursements = asyncHandler(async (req, res) => {
  const filter = tenantFilter(req);
  if (req.query.status) filter.status = req.query.status;
  res.json(await Reimbursement.find(filter).populate('employeeId', 'name email department').populate('reportId', 'title status').sort({ createdAt: -1 }));
});

export const processReimbursement = asyncHandler(async (req, res) => {
  const reimbursement = await Reimbursement.findOne({ _id: req.params.id, ...tenantFilter(req) });
  if (!reimbursement) throw new ApiError(404, 'Reimbursement not found');
  res.json(await processPayment({ req, reimbursement, status: req.body.status, reference: req.body.reference }));
});

export const listViolations = asyncHandler(async (req, res) => {
  const expenses = await Expense.find({
    ...tenantFilter(req),
    $or: [{ 'policyViolations.0': { $exists: true } }, { 'fraudFlags.0': { $exists: true } }]
  }).populate('employeeId', 'name email department').sort({ createdAt: -1 });
  res.json(expenses);
});

export const listApprovalHistory = asyncHandler(async (req, res) => {
  res.json(await Approval.find(tenantFilter(req)).populate('approverId', 'name email role').sort({ createdAt: -1 }));
});

export const accountingExport = asyncHandler(async (req, res) => {
  res.header('Content-Type', 'text/csv');
  res.attachment('accounting-export.csv');
  res.send(await buildAccountingExport({ companyId: req.companyId }));
});
