import { asyncHandler } from '../helpers/asyncHandler.js';
import { ApiError } from '../helpers/apiError.js';
import { tenantFilter } from '../middleware/tenant.middleware.js';
import { Expense, Receipt } from '../models/Expense.js';
import { ExpenseReport, OcrLog, Reimbursement } from '../models/Enterprise.js';
import { AdvanceRequest, ExpenseAuditLog, ExpenseComment, ExpenseParticipant, ExpenseSplitAllocation } from '../models/ExpenseEcosystem.js';
import { evaluateExpensePolicy } from '../policies/policy.engine.js';
import { resolveExpenseWorkflow } from '../workflows/workflow.engine.js';
import { detectFraud } from '../services/fraud.service.js';
import { extractReceiptFields } from '../services/ocr.service.js';
import { consumeBudgetForExpense } from '../services/budget.service.js';
import { applyApprovalAction, persistApprovalPath } from '../services/approval.engine.js';
import { findActiveExpenseCategory } from '../services/category.service.js';
import { createReimbursementForExpense, markPaid, markPaymentProcessing } from '../services/reimbursement.service.js';
import { actOnTravelRequest, createTravelRequest, estimateTravelRequest, listTravelRequestsForUser } from '../services/travel.service.js';
import { createAdvanceRequest, settleAdvance } from '../services/advance.service.js';
import { calculateSharedAllocations, loadSharedExpenseDetails, upsertSharedExpenseRecords, validateSharedParticipants } from '../services/sharedExpense.service.js';
import { writeAudit } from '../audit/audit.service.js';
import { enqueueNotification } from '../jobs/queue.js';
import { notifyExpenseStatusChanged, notifyExpenseSubmitted, notifyReportSubmitted, notifyTravelSubmitted, notifyTravelStatusChanged } from '../notification/notification.service.js';
import { normalizeExpenseStatus, nextStatusFromApprovalPath } from '../constants/expenseLifecycle.js';
import { listAvailableTravelAssets } from '../services/assetIntegration.service.js';
import crypto from 'crypto';
import fs from 'fs';

const fileHash = (file) => {
  if (!file?.path || !fs.existsSync(file.path)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(file.path)).digest('hex');
};

const auditExpense = async ({ req, expense, action, before, after, metadata }) => {
  await ExpenseAuditLog.create({
    companyId: req.companyId,
    expenseId: expense?._id,
    action,
    actor: { userId: req.user?._id, role: req.user?.role, name: req.user?.name },
    before,
    after,
    metadata,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
};

const ensureActiveExpenseCategory = async ({ req, category }) => {
  const categoryDoc = await findActiveExpenseCategory({ companyId: req.companyId, category, actorId: req.user?._id });
  if (!categoryDoc) {
    throw new ApiError(400, `Expense category '${category}' is inactive or not configured`);
  }
  return categoryDoc;
};

export const listExpenses = asyncHandler(async (req, res) => {
  const filters = { ...tenantFilter(req) };
  if (req.query.status) filters.status = normalizeExpenseStatus(req.query.status);
  if (req.query.mine === 'true') filters.employeeId = req.user._id;
  if (req.query.participated === 'true') {
    const participantRows = await ExpenseParticipant.find({ companyId: req.companyId, employeeId: req.user._id }).select('expenseId').lean();
    filters._id = { $in: participantRows.map((row) => row.expenseId) };
  }
  const expenses = await Expense.find(filters).populate('employeeId', 'name email department').sort({ createdAt: -1 });
  res.json(expenses);
});

export const listTravelAssets = asyncHandler(async (req, res) => {
  const assets = await listAvailableTravelAssets({ search: req.query.search, category: req.query.category });
  res.json({ success: true, assets });
});

export const getExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({ _id: req.params.id, ...tenantFilter(req) })
    .populate('employeeId', 'name email department')
    .populate('receipts');
  if (!expense) throw new ApiError(404, 'Expense not found');
  res.json(expense);
});

// One-time migration: transitions 'submitted' expenses to 'manager_review'
export const migrateSubmitted = asyncHandler(async (req, res) => {
  const result = await Expense.updateMany(
    { ...tenantFilter(req), status: 'submitted' },
    { $set: { status: 'manager_review' } }
  );
  res.json({ migrated: result.modifiedCount, message: `${result.modifiedCount} expenses transitioned from submitted → manager_review` });
});

export const createExpense = asyncHandler(async (req, res) => {
  const { receiptFile, receiptFiles = [], sharedExpense, ...expenseData } = req.body;
  const categoryDoc = await ensureActiveExpenseCategory({ req, category: expenseData.category });
  expenseData.category = categoryDoc.name;
  const normalizedReceiptFiles = receiptFiles.length ? receiptFiles : receiptFile ? [receiptFile] : [];
  if (sharedExpense?.enabled && normalizedReceiptFiles.length > 1) throw new ApiError(400, 'Shared expenses support only one receipt');
  const requestedStatus = normalizeExpenseStatus(expenseData.status || 'DRAFT');
  const expense = await Expense.create({
    ...expenseData,
    status: requestedStatus === 'SUBMITTED' ? 'VALIDATING' : 'DRAFT',
    companyId: req.companyId,
    employeeId: req.user._id,
    createdBy: req.user._id,
    baseCurrency: expenseData.currency || 'INR',
    convertedAmount: expenseData.convertedAmount || expenseData.amount
  });

  let receiptCount = 0;
  for (const item of normalizedReceiptFiles) {
    const duplicateReceipt = await Receipt.findOne({
      companyId: req.companyId,
      $or: [
        { fileHash: item.fileHash },
        { originalName: item.originalName, size: item.size }
      ]
    });

    const receipt = await Receipt.create({
      companyId: req.companyId,
      expenseId: expense._id,
      fileName: item.fileName,
      originalName: item.originalName,
      mimeType: item.mimeType,
      path: item.path,
      size: item.size,
      ocr: item.ocr,
      fileHash: item.fileHash
    });

    expense.receipts.push(receipt._id);
    expense.attachments.push({
      fileName: item.fileName,
      originalName: item.originalName,
      mimeType: item.mimeType,
      path: item.path,
      size: item.size
    });

    await OcrLog.create({
      companyId: req.companyId,
      receiptId: receipt._id,
      expenseId: expense._id,
      status: 'completed',
      extracted: item.ocr,
      duplicateScore: duplicateReceipt ? 90 : 0,
      fraudScore: duplicateReceipt ? 70 : 0
    });

    if (duplicateReceipt) {
      expense.fraudFlags.push({
        code: 'DUPLICATE_RECEIPT',
        message: 'This receipt appears to be uploaded on another expense',
        score: 90
      });
    }
    receiptCount += 1;
  }

  expense.policyViolations = await evaluateExpensePolicy({ companyId: req.companyId, user: req.user, expense, receiptCount });
  expense.fraudFlags = expense.fraudFlags.concat(await detectFraud({ companyId: req.companyId, expense }));

  if (sharedExpense?.enabled) {
    await upsertSharedExpenseRecords({
      companyId: req.companyId,
      expense,
      creatorId: req.user._id,
      participantIds: sharedExpense.participantIds,
      splitType: sharedExpense.splitType,
      splitValues: sharedExpense.splitValues || {},
      reimbursementMode: sharedExpense.reimbursementMode || 'creator_full'
    });
  }
  
  if (requestedStatus === 'SUBMITTED') {
    expense.approvalPath = await resolveExpenseWorkflow(req.companyId, expense);
    await persistApprovalPath({ companyId: req.companyId, module: 'expense', recordId: expense._id, approvalPath: expense.approvalPath });
    
    if (expense.policyViolations.some((v) => v.severity === 'block')) {
      expense.status = 'SENT_BACK';
    } else {
      expense.status = nextStatusFromApprovalPath(expense.approvalPath);
    }
  }
  expense.timeline.push({ status: expense.status, action: requestedStatus === 'SUBMITTED' ? 'submitted' : 'draft_saved', actorId: req.user._id });

  await expense.save();
  await writeAudit({ req, action: 'expense.create', entity: 'Expense', entityId: expense._id.toString(), after: expense.toObject() });
  await auditExpense({ req, expense, action: expense.isSharedExpense ? 'shared_expense.create' : 'expense.create', after: expense.toObject(), metadata: { sharedExpense } });
  
  if (requestedStatus === 'SUBMITTED') {
    await notifyExpenseSubmitted({ req, expense });
    if (expense.isSharedExpense) await notifySharedParticipants({ req, expense, title: 'Shared Expense Submitted', message: `${req.user.name} submitted a shared ${expense.category} expense.` });
  }

  res.status(201).json(expense);
});

export const scanReceiptOnly = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No receipt file uploaded');
  const hash = fileHash(req.file);
  const ocr = await extractReceiptFields(req.file);
  res.status(200).json({
    ocr,
    file: {
      fileName: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      path: req.file.path,
      size: req.file.size,
      fileHash: hash
    }
  });
});

export const uploadReceipt = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({ _id: req.params.id, ...tenantFilter(req) }).populate('employeeId', 'department name email');
  if (!expense) throw new ApiError(404, 'Expense not found');
  if (expense.isSharedExpense && expense.receipts.length >= 1) throw new ApiError(400, 'Shared expenses allow only one receipt uploaded by the creator');
  if (String(expense.createdBy || expense.employeeId) !== String(req.user._id)) throw new ApiError(403, 'Only the expense creator can upload receipts');
  const ocr = await extractReceiptFields(req.file);
  const hash = fileHash(req.file);
  const duplicateReceipt = await Receipt.findOne({
    companyId: req.companyId,
    $or: [{ fileHash: hash }, { originalName: req.file.originalname, size: req.file.size }],
    _id: { $nin: expense.receipts }
  });
  const receipt = await Receipt.create({
    companyId: req.companyId,
    expenseId: expense._id,
    fileName: req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    path: req.file.path,
    size: req.file.size,
    ocr,
    fileHash: hash
  });
  await OcrLog.create({
    companyId: req.companyId,
    receiptId: receipt._id,
    expenseId: expense._id,
    status: 'completed',
    extracted: ocr,
    duplicateScore: duplicateReceipt ? 90 : 0,
    fraudScore: duplicateReceipt ? 70 : 0
  });
  expense.receipts.push(receipt._id);
  if (duplicateReceipt) expense.fraudFlags.push({ code: 'DUPLICATE_RECEIPT', message: 'This receipt appears to be uploaded on another expense', score: 90 });
  if (!expense.amount && ocr.amount) expense.amount = ocr.amount;
  if (!expense.merchant && ocr.merchant) expense.merchant = ocr.merchant;
  if (!expense.taxAmount && ocr.tax) expense.taxAmount = ocr.tax;
  if (!expense.gstNumber && ocr.gstNumber) expense.gstNumber = ocr.gstNumber;
  if (!expense.invoiceNumber && ocr.invoiceNumber) expense.invoiceNumber = ocr.invoiceNumber;
  expense.attachments.push({ fileName: req.file.filename, originalName: req.file.originalname, mimeType: req.file.mimetype, path: req.file.path, size: req.file.size });
  expense.timeline.push({ status: expense.status, action: 'receipt_uploaded', actorId: req.user._id, note: `OCR confidence ${ocr.confidence ?? 0}` });
  await expense.save();
  await auditExpense({ req, expense, action: 'expense.receipt.upload', after: { receiptId: receipt._id, ocr } });
  res.status(201).json({ receipt, expense });
});

export const submitExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({ _id: req.params.id, ...tenantFilter(req) }).populate('employeeId', 'department name email');
  if (!expense) throw new ApiError(404, 'Expense not found');
  if (!['DRAFT', 'SENT_BACK', 'draft', 'sent_back'].includes(expense.status)) throw new ApiError(400, `Cannot submit expense with status '${expense.status}'`);
  if (expense.isSharedExpense) {
    const allocationCount = await ExpenseSplitAllocation.countDocuments({ companyId: req.companyId, expenseId: expense._id });
    if (allocationCount !== expense.participantCount || !allocationCount) throw new ApiError(400, 'Shared expense allocations must be calculated before submission');
    const hardAllocationViolations = await ExpenseSplitAllocation.countDocuments({ companyId: req.companyId, expenseId: expense._id, 'policyViolations.severity': 'block' });
    if (hardAllocationViolations) throw new ApiError(400, 'Shared expense has hard policy violations');
  }

  expense.status = 'VALIDATING';
  expense.policyViolations = await evaluateExpensePolicy({ companyId: req.companyId, user: req.user, expense, receiptCount: expense.receipts.length });
  expense.fraudFlags = await detectFraud({ companyId: req.companyId, expense });
  expense.approvalPath = await resolveExpenseWorkflow(req.companyId, expense);
  await persistApprovalPath({ companyId: req.companyId, module: 'expense', recordId: expense._id, approvalPath: expense.approvalPath });

  if (expense.policyViolations.some((v) => v.severity === 'block')) {
    expense.status = 'SENT_BACK';
  } else {
    expense.status = nextStatusFromApprovalPath(expense.approvalPath);
  }
  expense.timeline.push({ status: expense.status, action: 'submitted', actorId: req.user._id });

  await expense.save();
  await writeAudit({ req, action: 'expense.submit', entity: 'Expense', entityId: expense._id.toString(), after: expense.toObject() });
  await auditExpense({ req, expense, action: 'expense.submit', after: expense.toObject() });

  await notifyExpenseSubmitted({ req, expense });
  if (expense.isSharedExpense) await notifySharedParticipants({ req, expense, title: 'Shared Expense Submitted', message: `${req.user.name} submitted a shared ${expense.category} expense.` });

  res.json(expense);
});

export const actOnExpense = asyncHandler(async (req, res) => {
  const { action, note } = req.body;
  const expense = await Expense.findOne({ _id: req.params.id, ...tenantFilter(req) });
  if (!expense) throw new ApiError(404, 'Expense not found');
  const statusRoleMap = {
    PENDING_MANAGER: ['manager', 'company_admin', 'super_admin'],
    PENDING_FINANCE: ['finance', 'company_admin', 'super_admin'],
    UNDER_VERIFICATION: ['finance', 'company_admin', 'super_admin'],
    PENDING_ACCOUNTS: ['cfo', 'finance', 'company_admin', 'super_admin']
  };
  const allowedRoles = statusRoleMap[expense.status];
  if (allowedRoles && !allowedRoles.includes(req.user.role)) throw new ApiError(403, `Role '${req.user.role}' cannot act on ${expense.status}`);
  const before = expense.toObject();
  try {
    await applyApprovalAction({ record: expense, action, note, actorId: req.user._id });
  } catch (error) {
    throw new ApiError(400, error.message);
  }
  if (expense.status === 'UNDER_VERIFICATION') {
    await consumeBudgetForExpense({ companyId: req.companyId, expense, employee: expense.employeeId });
  }
  expense.timeline.push({ status: expense.status, action, actorId: req.user._id, note });
  await expense.save();
  await notifyExpenseStatusChanged({ req, expense, action, note });
  if (expense.isSharedExpense) await notifySharedParticipants({ req, expense, title: `Shared Expense ${expense.status}`, message: `Shared ${expense.category} expense is now ${expense.status}.` });
  await writeAudit({ req, action: `expense.${action}`, entity: 'Expense', entityId: expense._id.toString(), after: expense.toObject() });
  await auditExpense({ req, expense, action: `expense.${action}`, before, after: expense.toObject(), metadata: { note } });
  res.json(expense);
});

const notifySharedParticipants = async ({ req, expense, title, message }) => {
  const participants = await ExpenseParticipant.find({ companyId: req.companyId, expenseId: expense._id, participationType: 'participant' });
  await Promise.all(participants.map((participant) => enqueueNotification({
    companyId: req.companyId,
    userId: participant.employeeId,
    title,
    message,
    data: { expenseId: expense._id, sharedExpense: true }
  })));
};

export const calculateSharedSplit = asyncHandler(async (req, res) => {
  const allocations = calculateSharedAllocations({
    totalAmount: req.body.totalAmount,
    taxAmount: req.body.taxAmount || 0,
    splitType: req.body.splitType || 'equal',
    participantIds: req.body.participantIds || [],
    splitValues: req.body.splitValues || {}
  });
  const employees = await validateSharedParticipants({ companyId: req.companyId, participantIds: allocations.map((item) => item.employeeId) });
  const employeeById = new Map(employees.map((employee) => [String(employee._id), employee]));
  res.json({
    participantCount: allocations.length,
    allocationTotal: allocations.reduce((sum, item) => sum + item.allocatedAmount, 0),
    allocations: allocations.map((allocation) => {
      const employee = employeeById.get(String(allocation.employeeId));
      return { ...allocation, employeeName: employee?.name, departmentId: employee?.department };
    })
  });
});

export const createSharedExpense = (req, res, next) => {
  req.body = {
    ...req.body,
    sharedExpense: {
      enabled: true,
      participantIds: req.body.participantIds,
      splitType: req.body.splitType,
      splitValues: req.body.splitValues,
      reimbursementMode: req.body.reimbursementMode
    }
  };
  return createExpense(req, res, next);
};

export const submitSharedExpense = (req, res, next) => {
  req.params.id = req.body.expenseId || req.params.id;
  if (!req.params.id) return next(new ApiError(400, 'expenseId is required'));
  return submitExpense(req, res, next);
};

export const getSharedExpenseDetails = asyncHandler(async (req, res) => {
  const expenseId = req.query.expenseId || req.params.id;
  if (!expenseId) throw new ApiError(400, 'expenseId is required');
  res.json(await loadSharedExpenseDetails({ companyId: req.companyId, expenseId }));
});

export const listSharedExpenseParticipants = asyncHandler(async (req, res) => {
  const expenseId = req.query.expenseId || req.params.id;
  if (!expenseId) throw new ApiError(400, 'expenseId is required');
  const [participants, allocations] = await Promise.all([
    ExpenseParticipant.find({ companyId: req.companyId, expenseId }).sort({ createdAt: 1 }),
    ExpenseSplitAllocation.find({ companyId: req.companyId, expenseId }).sort({ createdAt: 1 })
  ]);
  res.json({ participants, allocations });
});

export const reimburseSharedExpense = asyncHandler(async (req, res) => {
  const expenseId = req.body.expenseId || req.params.id;
  const expense = await Expense.findOne({ _id: expenseId, ...tenantFilter(req) });
  if (!expense) throw new ApiError(404, 'Shared expense not found');
  if (!expense.isSharedExpense) throw new ApiError(400, 'Expense is not a shared expense');

  const mode = req.body.reimbursementMode || expense.reimbursementMode || 'creator_full';
  const allocations = await ExpenseSplitAllocation.find({ companyId: req.companyId, expenseId: expense._id });
  if (mode === 'creator_full') {
    const reimbursement = await createReimbursementForExpense({ req, expense, method: req.body.method || 'bank_transfer' });
    if (req.body.markPaid) await markPaid({ reimbursement, reference: req.body.transactionId });
    await ExpenseSplitAllocation.updateMany({ companyId: req.companyId, expenseId: expense._id }, { $set: { reimbursementStatus: req.body.markPaid ? 'paid' : 'processing', ledgerStatus: 'posted', settledAt: req.body.markPaid ? new Date() : undefined } });
  } else {
    await Promise.all(allocations.map((allocation) => Reimbursement.create({
      companyId: req.companyId,
      employeeId: allocation.employeeId,
      amount: allocation.allocatedAmount,
      currency: expense.currency || 'INR',
      method: req.body.method || 'bank_transfer',
      reference: req.body.transactionId,
      status: req.body.markPaid ? 'paid' : 'processing',
      paidAt: req.body.markPaid ? new Date() : undefined,
      createdBy: req.user._id
    })));
    await ExpenseSplitAllocation.updateMany({ companyId: req.companyId, expenseId: expense._id }, { $set: { reimbursementStatus: req.body.markPaid ? 'paid' : 'processing', ledgerStatus: 'posted', settledAt: req.body.markPaid ? new Date() : undefined } });
  }

  expense.reimbursementMode = mode;
  expense.status = req.body.markPaid ? 'REIMBURSED' : 'PAYMENT_PROCESSING';
  expense.timeline.push({ status: expense.status, action: 'shared_reimbursement_processed', actorId: req.user._id, note: mode });
  await expense.save();
  await auditExpense({ req, expense, action: 'shared_expense.reimburse', metadata: { mode, allocationCount: allocations.length } });
  await notifySharedParticipants({ req, expense, title: 'Shared Expense Reimbursement', message: `Shared ${expense.category} reimbursement is ${expense.status}.` });
  res.json(await loadSharedExpenseDetails({ companyId: req.companyId, expenseId: expense._id }));
});

export const cloneExpense = asyncHandler(async (req, res) => {
  const source = await Expense.findOne({ _id: req.params.id, ...tenantFilter(req) }).lean();
  if (!source) throw new ApiError(404, 'Expense not found');
  const { _id, createdAt, updatedAt, approvalPath, receipts, timeline, status, ...copy } = source;
  const expense = await Expense.create({
    ...copy,
    status: 'DRAFT',
    receipts: [],
    approvalPath: [],
    timeline: [{ status: 'DRAFT', action: 'cloned', actorId: req.user._id, note: `Cloned from ${_id}` }],
    createdBy: req.user._id
  });
  await auditExpense({ req, expense, action: 'expense.clone', metadata: { sourceExpenseId: _id } });
  res.status(201).json(expense);
});

export const addExpenseComment = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({ _id: req.params.id, ...tenantFilter(req) });
  if (!expense) throw new ApiError(404, 'Expense not found');
  const comment = await ExpenseComment.create({
    companyId: req.companyId,
    expenseId: expense._id,
    body: req.body.body,
    visibility: req.body.visibility || 'employee',
    actor: { userId: req.user._id, role: req.user.role, name: req.user.name }
  });
  expense.timeline.push({ status: expense.status, action: 'comment_added', actorId: req.user._id });
  await expense.save();
  await auditExpense({ req, expense, action: 'expense.comment', metadata: { commentId: comment._id } });
  if (String(expense.employeeId) !== String(req.user._id)) {
    await enqueueNotification({
      companyId: req.companyId,
      userId: expense.employeeId,
      title: 'New comment on expense',
      message: `${req.user.name || 'Someone'} commented on your ${expense.category || 'expense'} expense.`,
      category: 'comment',
      actionUrl: `/expenses/${expense._id}`,
      data: { kind: 'expense', expenseId: expense._id, commentId: comment._id, actorId: req.user._id }
    });
  }
  res.status(201).json(comment);
});

export const getExpenseTimeline = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({ _id: req.params.id, ...tenantFilter(req) }).lean();
  if (!expense) throw new ApiError(404, 'Expense not found');
  const [comments, auditLogs] = await Promise.all([
    ExpenseComment.find({ companyId: req.companyId, expenseId: expense._id }).sort({ createdAt: -1 }).lean(),
    ExpenseAuditLog.find({ companyId: req.companyId, expenseId: expense._id }).sort({ createdAt: -1 }).lean()
  ]);
  res.json({ timeline: expense.timeline || [], comments, auditLogs });
});

export const splitExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({ _id: req.params.id, ...tenantFilter(req) });
  if (!expense) throw new ApiError(404, 'Expense not found');
  const splitTotal = (req.body.split || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  if (Math.round(splitTotal * 100) !== Math.round(Number(expense.amount) * 100)) throw new ApiError(400, 'Split total must match expense amount');
  expense.split = req.body.split;
  expense.timeline.push({ status: expense.status, action: 'split_updated', actorId: req.user._id });
  await expense.save();
  res.json(expense);
});

export const listExpenseReports = asyncHandler(async (req, res) => {
  res.json(await ExpenseReport.find(tenantFilter(req)).populate('employeeId', 'name email department').sort({ createdAt: -1 }));
});

export const createExpenseReport = asyncHandler(async (req, res) => {
  const expenses = await Expense.find({ _id: { $in: req.body.expenseIds || [] }, ...tenantFilter(req), employeeId: req.user._id });
  const totalAmount = expenses.reduce((sum, expense) => sum + Number(expense.convertedAmount || expense.amount || 0), 0);
  const nextReportNo = () => `RPT-FY26-${Date.now().toString(36).toUpperCase()}`;

  const report = await ExpenseReport.create({
    companyId: req.companyId,
    employeeId: req.user._id,
    reportNo: nextReportNo(),
    title: req.body.title || `Expense Report ${new Date().toLocaleDateString('en-IN')}`,
    expenseIds: expenses.map((expense) => expense._id),
    expenses: expenses.map((expense) => expense._id),
    totalAmount: totalAmount,
    currency: req.body.currency || 'INR',
    total: {
      amount: totalAmount,
      currency: req.body.currency || 'INR'
    },
    status: 'draft',
    createdBy: req.user._id
  });
  await Expense.updateMany({ _id: { $in: expenses.map((expense) => expense._id) } }, { $set: { reportId: report._id } });
  res.status(201).json(report);
});

export const submitExpenseReport = asyncHandler(async (req, res) => {
  const report = await ExpenseReport.findOne({ _id: req.params.id, ...tenantFilter(req) });
  if (!report) throw new ApiError(404, 'Report not found');
  report.status = 'submitted';
  report.submittedAt = new Date();
  const targetExpenseIds = (report.expenseIds && report.expenseIds.length) ? report.expenseIds : (report.expenses || []);
  await Expense.updateMany({ _id: { $in: targetExpenseIds }, ...tenantFilter(req) }, { $set: { status: 'PENDING_MANAGER' } });
  await report.save();
  await notifyReportSubmitted({ req, report });
  await writeAudit({ req, action: 'expense_report.submit', entity: 'ExpenseReport', entityId: report._id.toString(), after: report.toObject() });
  res.json(report);
});

export const verifyFinance = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({ _id: req.params.id, ...tenantFilter(req) });
  if (!expense) throw new ApiError(404, 'Expense not found');
  const before = expense.toObject();
  if (req.body.action === 'reject') expense.status = 'REJECTED';
  else if (req.body.action === 'hold') expense.status = 'UNDER_VERIFICATION';
  else expense.status = 'PAYMENT_PROCESSING';
  expense.timeline.push({ status: expense.status, action: `finance_${req.body.action || 'verify'}`, actorId: req.user._id, note: req.body.note });
  await expense.save();
  await auditExpense({ req, expense, action: 'expense.finance.verify', before, after: expense.toObject(), metadata: req.body });
  await notifyExpenseStatusChanged({ req, expense, action: req.body.action || 'verify', note: req.body.note });
  res.json(expense);
});

export const processExpenseReimbursement = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({ _id: req.params.id, ...tenantFilter(req) });
  if (!expense) throw new ApiError(404, 'Expense not found');
  if (!['PAYMENT_PROCESSING', 'REIMBURSED', 'UNDER_VERIFICATION'].includes(expense.status)) {
    throw new ApiError(400, `Cannot reimburse expense with status '${expense.status}'`);
  }

  if (expense.isSharedExpense && expense.reimbursementMode === 'individual') {
    const allocations = await ExpenseSplitAllocation.find({ companyId: req.companyId, expenseId: expense._id });
    if (!allocations.length) throw new ApiError(400, 'Shared expense allocations are missing');
    const reimbursements = await Promise.all(allocations.map((allocation) => Reimbursement.findOneAndUpdate(
      { companyId: req.companyId, expenseId: expense._id, employeeId: allocation.employeeId },
      {
        $setOnInsert: {
          companyId: req.companyId,
          expenseId: expense._id,
          employeeId: allocation.employeeId,
          amount: allocation.allocatedAmount,
          currency: expense.baseCurrency || expense.currency || 'INR',
          method: req.body.method || 'bank_transfer',
          createdBy: req.user._id
        },
        $set: {
          status: req.body.markPaid ? 'paid' : 'processing',
          reference: req.body.transactionId,
          paidAt: req.body.markPaid ? new Date() : undefined,
          updatedBy: req.user._id
        }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )));
    await ExpenseSplitAllocation.updateMany(
      { companyId: req.companyId, expenseId: expense._id },
      { $set: { reimbursementStatus: req.body.markPaid ? 'paid' : 'processing', ledgerStatus: 'posted', settledAt: req.body.markPaid ? new Date() : undefined } }
    );
    expense.status = req.body.markPaid ? 'REIMBURSED' : 'PAYMENT_PROCESSING';
    expense.timeline.push({ status: expense.status, action: 'shared_reimbursement_processing', actorId: req.user._id, note: req.body.transactionId });
    await expense.save();
    await notifyExpenseStatusChanged({ req, expense, action: 'reimburse', note: req.body.markPaid ? 'Your reimbursement has been paid.' : 'Your reimbursement is being processed.' });
    return res.status(201).json({ reimbursements, expense });
  }

  const reimbursement = await createReimbursementForExpense({ req, expense, method: req.body.method || 'bank_transfer' });
  await markPaymentProcessing({ reimbursement, reference: req.body.transactionId, method: req.body.method });
  if (req.body.markPaid) {
    await markPaid({ reimbursement, reference: req.body.transactionId });
    expense.status = 'REIMBURSED';
  } else {
    expense.status = 'PAYMENT_PROCESSING';
  }
  if (expense.isSharedExpense) {
    await ExpenseSplitAllocation.updateMany(
      { companyId: req.companyId, expenseId: expense._id },
      { $set: { reimbursementStatus: req.body.markPaid ? 'paid' : 'processing', ledgerStatus: 'posted', settledAt: req.body.markPaid ? new Date() : undefined } }
    );
  }
  expense.timeline.push({ status: expense.status, action: 'reimbursement_processing', actorId: req.user._id, note: req.body.transactionId });
  await expense.save();
  await notifyExpenseStatusChanged({ req, expense, action: 'reimburse', note: req.body.markPaid ? 'Your reimbursement has been paid.' : 'Your reimbursement is being processed.' });
  res.status(201).json({ reimbursement, expense });
});

export const closeExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({ _id: req.params.id, ...tenantFilter(req) });
  if (!expense) throw new ApiError(404, 'Expense not found');
  expense.status = 'CLOSED';
  expense.timeline.push({ status: 'CLOSED', action: 'closed', actorId: req.user._id, note: req.body.note });
  await expense.save();
  await notifyExpenseStatusChanged({ req, expense, action: 'close', note: req.body.note });
  res.json(expense);
});

export const listTravelRequests = asyncHandler(async (req, res) => {
  res.json(await listTravelRequestsForUser({ req }));
});

export const estimateTravel = asyncHandler(async (req, res) => {
  res.json(await estimateTravelRequest({ payload: req.body, user: req.user }));
});

export const createTravel = asyncHandler(async (req, res) => {
  const trip = await createTravelRequest({ req, payload: req.body });
  if (req.body.status === 'SUBMITTED' || req.body.status === 'submitted') {
    await notifyTravelSubmitted({ req, trip });
  }
  res.status(201).json(trip);
});

export const actionTravel = asyncHandler(async (req, res) => {
  const trip = await actOnTravelRequest({ req, id: req.params.id, action: req.body.action, note: req.body.note });
  if (!trip) throw new ApiError(404, 'Travel request not found or action not allowed');
  await notifyTravelStatusChanged({ req, trip, action: req.body.action, note: req.body.note });
  res.json(trip);
});

export const listAdvanceRequests = asyncHandler(async (req, res) => {
  res.json(await AdvanceRequest.find(tenantFilter(req)).populate('employeeId', 'name email department').sort({ createdAt: -1 }));
});

export const createAdvance = asyncHandler(async (req, res) => {
  res.status(201).json(await createAdvanceRequest({ req, payload: req.body }));
});

export const settleAdvanceRequest = asyncHandler(async (req, res) => {
  const advance = await AdvanceRequest.findOne({ _id: req.params.id, ...tenantFilter(req) });
  if (!advance) throw new ApiError(404, 'Advance not found');
  res.json(await settleAdvance({ advance, expenseTotal: req.body.expenseTotal }));
});
