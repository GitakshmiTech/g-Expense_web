import mongoose from 'mongoose';
import { writeAudit } from '../audit/audit.service.js';
import { Budget } from '../models/Budget.js';
import { Expense } from '../models/Expense.js';
import { AuditLog } from '../models/AuditLog.js';
import { Notification } from '../models/Notification.js';
import { Travel } from '../models/Travel.js';
import { User } from '../models/User.js';
import { Approval, ExpenseReport } from '../models/Enterprise.js';
import { evaluateExpensePolicy } from '../policies/policy.engine.js';
import { detectFraud } from './fraud.service.js';
import { enqueueNotification } from '../jobs/queue.js';
import { consumeBudgetForExpense } from './budget.service.js';

const pendingExpenseStatuses = ['manager_review', 'finance_review', 'cfo_review'];
const terminalStatuses = ['approved', 'rejected', 'sent_back', 'paid', 'closed', 'reimbursed'];

export const getManagedEmployees = async (manager) => {
  const employees = await User.find({ companyId: manager.companyId, managerId: manager._id }).select('_id name email department');
  return employees;
};

const teamIds = async (manager) => (await getManagedEmployees(manager)).map((employee) => employee._id);

export const buildManagerDashboard = async ({ req }) => {
  const employeeIds = await teamIds(req.user);
  const teamFilter = { companyId: req.companyId, employeeId: { $in: employeeIds } };
  const [expenses, reports, trips, budgets, activities, notifications] = await Promise.all([
    Expense.find(teamFilter).populate('employeeId', 'name email department managerId').sort({ createdAt: -1 }).limit(100),
    ExpenseReport.find(teamFilter).populate('employeeId', 'name email department').sort({ createdAt: -1 }).limit(100),
    Travel.find(teamFilter).populate('employeeId', 'name email department').sort({ createdAt: -1 }).limit(50),
    Budget.find({ companyId: req.companyId, type: 'department', department: req.user.department, status: 'active' }),
    AuditLog.find({ companyId: req.companyId }).sort({ createdAt: -1 }).limit(12),
    Notification.find({ companyId: req.companyId, userId: req.user._id }).sort({ createdAt: -1 }).limit(20)
  ]);

  const totalSpend = expenses.reduce((sum, expense) => sum + Number(expense.convertedAmount || expense.amount || 0), 0);
  const pendingApprovals = [
    ...expenses.filter((expense) => pendingExpenseStatuses.includes(expense.status)),
    ...reports.filter((report) => ['submitted', 'manager_review'].includes(report.status)),
    ...trips.filter((trip) => trip.status === 'submitted')
  ];
  const policyViolations = expenses.reduce((sum, expense) => sum + (expense.policyViolations?.length || 0) + (expense.fraudFlags?.length || 0), 0);

  return {
    cards: {
      totalSpend,
      pendingApprovals: pendingApprovals.length,
      budgetAllocated: budgets.reduce((sum, budget) => sum + Number(budget.amount || 0), 0),
      budgetConsumed: budgets.reduce((sum, budget) => sum + Number(budget.consumed || 0), 0),
      policyViolations,
      teamMembers: employeeIds.length
    },
    expenses,
    reports,
    trips,
    budgets,
    pendingApprovals: pendingApprovals.map((item) => ({ ...item.toObject(), kind: item.collection.collectionName === 'expenses' ? 'expense' : item.collection.collectionName === 'expensereports' ? 'report' : 'trip' })),
    recentActivities: activities,
    notifications,
    charts: managerAnalyticsFromRecords(expenses, reports)
  };
};

export const listTeamExpenses = async ({ req, query }) => {
  const employeeIds = await teamIds(req.user);
  const filter = { companyId: req.companyId, employeeId: { $in: employeeIds } };
  if (query.status) filter.status = query.status;
  if (query.search) {
    filter.$or = [
      { category: new RegExp(query.search, 'i') },
      { merchant: new RegExp(query.search, 'i') },
      { description: new RegExp(query.search, 'i') }
    ];
  }
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 25), 1), 100);
  const [items, total] = await Promise.all([
    Expense.find(filter).populate('employeeId', 'name email department managerId').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Expense.countDocuments(filter)
  ]);
  return { items, total, page, limit };
};

export const getTeamExpenseDetails = async ({ req, id }) => {
  const employeeIds = await teamIds(req.user);
  const expense = await Expense.findOne({ _id: id, companyId: req.companyId, employeeId: { $in: employeeIds } }).populate('employeeId', 'name email department');
  if (!expense) return null;
  const approvals = await Approval.find({ companyId: req.companyId, module: 'expense', recordId: expense._id }).populate('approverId', 'name email role').sort({ step: 1 });
  return { expense, approvals };
};

export const listManagerPendingApprovals = async ({ req }) => {
  const employeeIds = await teamIds(req.user);

  // Build expense filter — if manager has direct reports, scope to them; otherwise show all company expenses in review
  const expenseFilter = {
    companyId: req.companyId,
    status: 'manager_review'
  };
  if (employeeIds.length > 0) expenseFilter.employeeId = { $in: employeeIds };

  const [expenses, reports, trips] = await Promise.all([
    Expense.find(expenseFilter).populate('employeeId', 'name email department'),
    ExpenseReport.find({ companyId: req.companyId, employeeId: { $in: employeeIds.length ? employeeIds : [] }, status: { $in: ['submitted', 'manager_review'] } }).populate('employeeId', 'name email department'),
    Travel.find({ companyId: req.companyId, employeeId: { $in: employeeIds.length ? employeeIds : [] }, status: 'submitted' }).populate('employeeId', 'name email department')
  ]);
  return [
    ...expenses.map((item) => ({ ...item.toObject(), kind: 'expense' })),
    ...reports.map((item) => ({ ...item.toObject(), kind: 'report' })),
    ...trips.map((item) => ({ ...item.toObject(), kind: 'trip' }))
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

export const managerAction = async ({ req, targetType, id, action, note }) => {
  if (targetType === 'expense') return actionExpense({ req, id, action, note });
  if (targetType === 'report') return actionReport({ req, id, action, note });
  if (targetType === 'trip') return actionTrip({ req, id, action, note });
  return null;
};

export const managerBulkAction = async ({ req, targetType, ids, action, note }) => {
  const results = [];
  for (const id of ids) {
    const result = await managerAction({ req, targetType, id, action, note });
    if (result) results.push(result);
  }
  return { processed: results.length, results };
};

export const listManagerReports = async ({ req, query }) => {
  const employeeIds = await teamIds(req.user);
  const filter = { companyId: req.companyId, employeeId: { $in: employeeIds } };
  if (query.status) filter.status = query.status;
  return ExpenseReport.find(filter).populate('employeeId', 'name email department').populate('expenses').sort({ createdAt: -1 });
};

export const listManagerTrips = async ({ req }) => {
  const employeeIds = await teamIds(req.user);
  return Travel.find({ companyId: req.companyId, employeeId: { $in: employeeIds } }).populate('employeeId', 'name email department').sort({ createdAt: -1 });
};

export const listManagerBudgets = async ({ req }) => {
  const employeeIds = await teamIds(req.user);
  const employees = await User.find({ _id: { $in: employeeIds } }).select('department');
  const departments = [...new Set([req.user.department, ...employees.map((employee) => employee.department).filter(Boolean)])];
  const budgets = await Budget.find({ companyId: req.companyId, department: { $in: departments }, status: 'active' }).sort({ createdAt: -1 });
  const categorySpending = await Expense.aggregate([
    { $match: { companyId: new mongoose.Types.ObjectId(String(req.companyId)), employeeId: { $in: employeeIds }, status: { $nin: ['draft', 'rejected'] } } },
    { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } }
  ]);
  return {
    budgets,
    thresholdAlerts: budgets.map((budget) => ({ budgetId: budget._id, name: budget.name, usage: budget.amount ? Math.round((budget.consumed / budget.amount) * 100) : 0 })).filter((item) => item.usage >= 80),
    categorySpending
  };
};

export const listManagerViolations = async ({ req }) => {
  const employeeIds = await teamIds(req.user);
  const expenses = await Expense.find({
    companyId: req.companyId,
    employeeId: { $in: employeeIds },
    $or: [{ 'policyViolations.0': { $exists: true } }, { 'fraudFlags.0': { $exists: true } }]
  }).populate('employeeId', 'name email department').sort({ createdAt: -1 });

  const refreshed = [];
  for (const expense of expenses) {
    const user = expense.employeeId;
    expense.policyViolations = await evaluateExpensePolicy({ companyId: req.companyId, user, expense, receiptCount: expense.receipts.length });
    expense.fraudFlags = await detectFraud({ companyId: req.companyId, expense });
    await expense.save();
    refreshed.push(expense);
  }
  return refreshed;
};

export const buildManagerAnalytics = async ({ req }) => {
  const employeeIds = await teamIds(req.user);
  const [expenses, reports] = await Promise.all([
    Expense.find({ companyId: req.companyId, employeeId: { $in: employeeIds } }).populate('employeeId', 'name email department').sort({ createdAt: -1 }),
    ExpenseReport.find({ companyId: req.companyId, employeeId: { $in: employeeIds } }).populate('employeeId', 'name email department').sort({ createdAt: -1 })
  ]);
  return managerAnalyticsFromRecords(expenses, reports);
};

const actionExpense = async ({ req, id, action, note }) => {
  const employeeIds = await teamIds(req.user);

  // Query by companyId + id; if manager has team, scope to team members only
  const filter = { _id: id, companyId: req.companyId, status: 'manager_review' };
  if (employeeIds.length > 0) filter.employeeId = { $in: employeeIds };

  const expense = await Expense.findOne(filter);
  if (!expense) return null;
  const before = expense.toObject();

  if (action === 'reject') expense.status = 'rejected';
  else if (action === 'send_back') expense.status = 'sent_back';
  else if (action === 'escalate') {
    expense.status = 'cfo_review';
    if (!expense.approvalPath.some((step) => step.approverRole === 'cfo')) {
      expense.approvalPath.push({ approverRole: 'cfo', status: 'pending' });
    }
  } else if (action === 'approve') {
    // Mark current manager step as approved
    const current = expense.approvalPath.find((step) => step.approverRole === 'manager' && step.status === 'pending');
    if (current) Object.assign(current, { status: 'approved', approverId: req.user._id, actedAt: new Date(), note });
    // Find next pending step
    const next = expense.approvalPath.find((step) => step.status === 'pending');
    expense.status = next ? `${next.approverRole}_review` : 'approved';
    if (!next) await consumeBudgetForExpense({ companyId: req.companyId, expense, employee: expense.employeeId });
  }

  await expense.save();
  await notifyOutcome({ req, userId: expense.employeeId, title: `Expense ${expense.status.replaceAll('_', ' ')}`, message: note || `Your expense is now ${expense.status.replaceAll('_', ' ')}` });
  await writeAudit({ req, action: `manager.expense.${action}`, entity: 'Expense', entityId: expense._id.toString(), before, after: expense.toObject() });
  return { ...expense.toObject(), kind: 'expense' };
};

const actionReport = async ({ req, id, action, note }) => {
  const employeeIds = await teamIds(req.user);
  const report = await ExpenseReport.findOne({ _id: id, companyId: req.companyId, employeeId: { $in: employeeIds } });
  if (!report) return null;
  const before = report.toObject();
  const statusMap = { approve: 'manager_approved', reject: 'rejected', send_back: 'sent_back', escalate: 'submitted' };
  report.status = statusMap[action] || report.status;
  report.updatedBy = req.user._id;
  await report.save();
  await Approval.findOneAndUpdate(
    { companyId: req.companyId, module: 'report', recordId: report._id, approverRole: 'manager', status: 'pending' },
    { status: action === 'approve' ? 'approved' : action === 'send_back' ? 'sent_back' : action === 'escalate' ? 'escalated' : 'rejected', note, approverId: req.user._id, actedAt: new Date(), updatedBy: req.user._id },
    { new: true, upsert: true }
  );
  if (action === 'approve') await Approval.create({ companyId: req.companyId, module: 'report', recordId: report._id, approverRole: 'finance', step: 2, status: 'pending', createdBy: req.user._id, updatedBy: req.user._id });
  if (action === 'escalate') await Approval.create({ companyId: req.companyId, module: 'report', recordId: report._id, approverRole: 'cfo', step: 2, status: 'pending', createdBy: req.user._id, updatedBy: req.user._id });
  await notifyOutcome({ req, userId: report.employeeId, title: `Report ${report.status}`, message: note || `Your report is ${report.status}` });
  await writeAudit({ req, action: `manager.report.${action}`, entity: 'ExpenseReport', entityId: report._id.toString(), before, after: report.toObject() });
  return { ...report.toObject(), kind: 'report' };
};

const actionTrip = async ({ req, id, action, note }) => {
  const employeeIds = await teamIds(req.user);
  const trip = await Travel.findOne({ _id: id, companyId: req.companyId, employeeId: { $in: employeeIds } });
  if (!trip) return null;
  const before = trip.toObject();
  if (action === 'approve') trip.status = 'approved';
  if (action === 'reject') trip.status = 'rejected';
  if (action === 'send_back') trip.status = 'draft';
  if (action === 'escalate') trip.status = 'submitted';
  trip.approvals.push({ approverId: req.user._id, status: action === 'send_back' ? 'sent_back' : action, note, actedAt: new Date() });
  await trip.save();
  await notifyOutcome({ req, userId: trip.employeeId, title: `Trip ${trip.status}`, message: note || `Your trip is ${trip.status}` });
  await writeAudit({ req, action: `manager.trip.${action}`, entity: 'Travel', entityId: trip._id.toString(), before, after: trip.toObject() });
  return { ...trip.toObject(), kind: 'trip' };
};

const notifyOutcome = async ({ req, userId, title, message }) => {
  await enqueueNotification({ companyId: req.companyId, userId, title, message, data: { actorId: req.user._id } });
};

const managerAnalyticsFromRecords = (expenses, reports) => {
  const monthlyTrends = Object.values(expenses.reduce((acc, expense) => {
    const month = new Date(expense.expenseDate || expense.createdAt).toISOString().slice(0, 7);
    acc[month] ||= { _id: month, total: 0, count: 0 };
    acc[month].total += Number(expense.amount || 0);
    acc[month].count += 1;
    return acc;
  }, {})).sort((a, b) => a._id.localeCompare(b._id));

  const topSpenders = Object.values(expenses.reduce((acc, expense) => {
    const employee = expense.employeeId?.name || 'Employee';
    acc[employee] ||= { _id: employee, total: 0, count: 0 };
    acc[employee].total += Number(expense.amount || 0);
    acc[employee].count += 1;
    return acc;
  }, {})).sort((a, b) => b.total - a.total).slice(0, 8);

  const approvalDelays = reports.map((report) => {
    const submittedAt = report.submittedAt || report.createdAt;
    const end = terminalStatuses.includes(report.status) ? report.updatedAt : new Date();
    return {
      _id: report.title,
      days: Math.max(Math.round((new Date(end) - new Date(submittedAt)) / 86400000), 0),
      status: report.status
    };
  }).sort((a, b) => b.days - a.days);

  return { monthlyTrends, topSpenders, approvalDelays };
};
