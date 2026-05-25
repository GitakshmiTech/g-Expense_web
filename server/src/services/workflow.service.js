import { stringify } from 'csv-stringify/sync';
import { writeAudit } from '../audit/audit.service.js';
import { Budget } from '../models/Budget.js';
import { Expense } from '../models/Expense.js';
import { Approval, ExpenseReport, Reimbursement } from '../models/Enterprise.js';
import { evaluateExpensePolicy } from '../policies/policy.engine.js';
import { detectFraud } from './fraud.service.js';
import { enqueueNotification } from '../jobs/queue.js';

const terminalStatuses = ['approved', 'rejected', 'sent_back', 'paid'];

export const buildWorkflowDashboard = async ({ companyId, user, panel }) => {
  const expenseFilter = { companyId };
  if (panel === 'manager') {
    expenseFilter.$or = [
      { 'approvalPath.approverRole': 'manager', status: { $in: ['submitted', 'manager_review'] } },
      { employeeId: { $ne: user._id } }
    ];
  }
  if (panel === 'finance') {
    expenseFilter.status = { $in: ['finance_review', 'approved', 'paid'] };
  }

  const [expenses, reports, reimbursements, budgets] = await Promise.all([
    Expense.find(expenseFilter).populate('employeeId', 'name email department managerId').sort({ createdAt: -1 }).limit(200),
    ExpenseReport.find({ companyId }).populate('employeeId', 'name email department').sort({ createdAt: -1 }).limit(100),
    Reimbursement.find({ companyId }).populate('employeeId', 'name email department').sort({ createdAt: -1 }).limit(100),
    Budget.find({ companyId, status: 'active' }).sort({ createdAt: -1 })
  ]);

  const totalSpend = expenses.reduce((sum, item) => sum + Number(item.convertedAmount || item.amount || 0), 0);
  const pendingApprovals = expenses.filter((item) => !terminalStatuses.includes(item.status)).length;
  const policyViolations = expenses.reduce((sum, item) => sum + item.policyViolations.length + item.fraudFlags.length, 0);
  const pendingReimbursement = reimbursements.filter((item) => ['pending', 'processing'].includes(item.status)).reduce((sum, item) => sum + item.amount, 0);

  return {
    cards: {
      totalSpend,
      pendingApprovals,
      policyViolations,
      pendingReimbursement,
      budgetConsumed: budgets.reduce((sum, item) => sum + Number(item.consumed || 0), 0),
      budgetAllocated: budgets.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    },
    expenses,
    reports,
    reimbursements,
    budgets,
    charts: {
      byStatus: Object.values(expenses.reduce((acc, item) => {
        acc[item.status] ||= { _id: item.status, total: 0, count: 0 };
        acc[item.status].total += Number(item.amount || 0);
        acc[item.status].count += 1;
        return acc;
      }, {})),
      byDepartment: Object.values(expenses.reduce((acc, item) => {
        const department = item.employeeId?.department || 'Unassigned';
        acc[department] ||= { _id: department, total: 0, count: 0 };
        acc[department].total += Number(item.amount || 0);
        acc[department].count += 1;
        return acc;
      }, {}))
    }
  };
};

export const createExpenseReport = async ({ req, expenseIds, title }) => {
  const expenses = await Expense.find({ _id: { $in: expenseIds }, companyId: req.companyId, employeeId: req.user._id });
  const totalAmount = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const report = await ExpenseReport.create({
    companyId: req.companyId,
    employeeId: req.user._id,
    title,
    expenses: expenses.map((expense) => expense._id),
    totalAmount,
    currency: expenses[0]?.currency || 'INR',
    createdBy: req.user._id,
    updatedBy: req.user._id
  });
  await writeAudit({ req, action: 'report.create', entity: 'ExpenseReport', entityId: report._id.toString(), after: report.toObject() });
  return report;
};

export const submitExpenseReport = async ({ req, report }) => {
  const expenses = await Expense.find({ _id: { $in: report.expenses }, companyId: req.companyId });
  for (const expense of expenses) {
    expense.status = 'submitted';
    expense.policyViolations = await evaluateExpensePolicy({ companyId: req.companyId, user: req.user, expense, receiptCount: expense.receipts.length });
    expense.fraudFlags = await detectFraud({ companyId: req.companyId, expense });
    await expense.save();
  }
  report.status = 'submitted';
  report.submittedAt = new Date();
  await report.save();
  await Approval.create({
    companyId: req.companyId,
    module: 'report',
    recordId: report._id,
    approverRole: 'manager',
    step: 1,
    status: 'pending',
    createdBy: req.user._id,
    updatedBy: req.user._id
  });
  await writeAudit({ req, action: 'report.submit', entity: 'ExpenseReport', entityId: report._id.toString(), after: report.toObject() });
  return report;
};

export const managerReviewReport = async ({ req, report, action, note }) => {
  const statusMap = {
    approve: 'manager_approved',
    reject: 'rejected',
    send_back: 'sent_back',
    escalate: 'submitted'
  };
  report.status = statusMap[action] || report.status;
  report.updatedBy = req.user._id;
  await report.save();
  await Approval.findOneAndUpdate(
    { companyId: req.companyId, module: 'report', recordId: report._id, approverRole: 'manager', status: 'pending' },
    { status: action === 'approve' || action === 'escalate' ? 'approved' : action === 'send_back' ? 'sent_back' : action, note, approverId: req.user._id, actedAt: new Date(), updatedBy: req.user._id },
    { new: true }
  );
  if (action === 'approve' || action === 'escalate') {
    await Approval.create({ companyId: req.companyId, module: 'report', recordId: report._id, approverRole: 'finance', step: 2, status: 'pending', createdBy: req.user._id, updatedBy: req.user._id });
  }
  await enqueueNotification({ companyId: req.companyId, userId: report.employeeId, title: `Report ${report.status}`, message: note || `Your report is now ${report.status}`, data: { reportId: report._id } });
  await writeAudit({ req, action: `report.manager.${action}`, entity: 'ExpenseReport', entityId: report._id.toString(), after: report.toObject() });
  return report;
};

export const financeVerifyReport = async ({ req, report, action, note }) => {
  const expenses = await Expense.find({ _id: { $in: report.expenses }, companyId: req.companyId });
  const hasHardViolation = expenses.some((expense) => expense.policyViolations.some((violation) => violation.severity === 'block'));
  if (action === 'verify' && hasHardViolation) {
    report.status = 'sent_back';
  } else if (action === 'verify') {
    report.status = 'finance_verified';
  } else if (action === 'reject') {
    report.status = 'rejected';
  } else if (action === 'send_back') {
    report.status = 'sent_back';
  }
  report.updatedBy = req.user._id;
  await report.save();
  await Approval.findOneAndUpdate(
    { companyId: req.companyId, module: 'report', recordId: report._id, approverRole: 'finance', status: 'pending' },
    { status: report.status === 'finance_verified' ? 'approved' : action === 'send_back' ? 'sent_back' : action, note, approverId: req.user._id, actedAt: new Date(), updatedBy: req.user._id },
    { new: true }
  );
  if (report.status === 'finance_verified') {
    await Reimbursement.create({
      companyId: req.companyId,
      employeeId: report.employeeId,
      reportId: report._id,
      amount: report.totalAmount,
      currency: report.currency,
      method: 'bank_transfer',
      status: 'pending',
      createdBy: req.user._id,
      updatedBy: req.user._id
    });
  }
  await writeAudit({ req, action: `report.finance.${action}`, entity: 'ExpenseReport', entityId: report._id.toString(), after: report.toObject() });
  return report;
};

export const processPayment = async ({ req, reimbursement, status, reference }) => {
  reimbursement.status = status;
  reimbursement.reference = reference || reimbursement.reference;
  reimbursement.updatedBy = req.user._id;
  if (status === 'paid') reimbursement.paidAt = new Date();
  await reimbursement.save();
  if (reimbursement.reportId && status === 'paid') {
    await ExpenseReport.findOneAndUpdate({ _id: reimbursement.reportId, companyId: req.companyId }, { status: 'reimbursed', updatedBy: req.user._id });
  }
  await writeAudit({ req, action: `reimbursement.${status}`, entity: 'Reimbursement', entityId: reimbursement._id.toString(), after: reimbursement.toObject() });
  return reimbursement;
};

export const buildAccountingExport = async ({ companyId }) => {
  const reimbursements = await Reimbursement.find({ companyId, status: 'paid' }).populate('employeeId', 'name email department').lean();
  return stringify(
    reimbursements.map((item) => ({
      date: item.paidAt,
      employee: item.employeeId?.name,
      department: item.employeeId?.department,
      amount: item.amount,
      currency: item.currency,
      method: item.method,
      reference: item.reference,
      ledger: 'Employee Reimbursements'
    })),
    { header: true }
  );
};
