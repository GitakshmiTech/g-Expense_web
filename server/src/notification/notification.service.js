import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { sendEmail } from '../services/email.service.js';
import { getIo } from '../sockets/socket.js';

const normalizeId = (value) => value?._id || value?.id || value;

const uniqueIds = (ids = []) => [...new Set(ids.map((id) => String(normalizeId(id) || '')).filter(Boolean))];

const formatMoney = (amount, currency = 'INR') => `${Number(amount || 0).toLocaleString('en-IN')} ${currency || 'INR'}`;

const expenseData = (expense, extra = {}) => ({
  kind: 'expense',
  expenseId: expense._id,
  category: expense.category,
  merchant: expense.merchant,
  amount: expense.amount,
  currency: expense.currency || 'INR',
  status: expense.status,
  ...extra
});

const findManagerRecipientsForUser = async ({ companyId, employee, excludeUserIds = [] }) => {
  const directManagerId = normalizeId(employee?.managerId);
  if (directManagerId) return uniqueIds([directManagerId]);
  const excluded = uniqueIds([employee?._id, employee?.id, ...excludeUserIds]);
  const departmentManagers = employee?.department
    ? await User.find({
      companyId,
      role: { $in: ['manager', 'company_admin'] },
      status: 'active',
      _id: { $nin: excluded },
      $or: [{ department: employee.department }, { role: 'company_admin' }]
    }).select('_id').lean()
    : [];
  if (departmentManagers?.length) return uniqueIds(departmentManagers.map((manager) => manager._id));

  const managers = await User.find({
    companyId,
    role: { $in: ['manager', 'company_admin'] },
    status: 'active',
    _id: { $nin: excluded }
  }).select('_id').lean();
  return uniqueIds(managers.map((manager) => manager._id));
};

export const notifyUser = async ({ companyId, userId, title, message, data, email, category = 'general', priority = 'normal', actionUrl }) => {
  if (!userId) return null;
  const notification = await Notification.create({
    companyId,
    userId,
    title,
    message,
    data,
    category,
    priority,
    actionUrl,
    type: 'in_app',
    deliveredAt: new Date()
  });
  getIo()?.to(`user:${userId}`).emit('notification:new', notification);
  if (email) await sendEmail({ to: email, subject: title, html: `<p>${message}</p>` });
  return notification;
};

export const notifyUsers = async ({ userIds = [], excludeUserIds = [], ...payload }) => {
  const excluded = new Set(uniqueIds(excludeUserIds));
  const recipients = uniqueIds(userIds).filter((id) => !excluded.has(id));
  return Promise.all(recipients.map((userId) => notifyUser({ ...payload, userId })));
};

export const findRoleRecipients = async ({ companyId, roles = [], excludeUserIds = [] }) => {
  if (!companyId || !roles.length) return [];
  const excluded = uniqueIds(excludeUserIds);
  const users = await User.find({
    companyId,
    role: { $in: roles },
    status: 'active',
    _id: { $nin: excluded }
  }).select('_id').lean();
  return users.map((user) => user._id);
};

export const notifyRole = async ({ companyId, roles = [], excludeUserIds = [], ...payload }) => {
  const userIds = await findRoleRecipients({ companyId, roles, excludeUserIds });
  return notifyUsers({ companyId, userIds, excludeUserIds, ...payload });
};

export const getNextApproverRoles = (status = '') => {
  const normalized = String(status).toLowerCase();
  if (normalized.includes('manager')) return ['manager', 'company_admin'];
  if (normalized.includes('finance') || normalized.includes('verification')) return ['finance', 'company_admin'];
  if (normalized.includes('cfo') || normalized.includes('accounts')) return ['cfo', 'finance', 'company_admin'];
  return [];
};

export const notifyExpenseSubmitted = async ({ req, expense }) => {
  const submitterId = normalizeId(expense.employeeId) || req.user?._id;
  const actionUrl = `/expenses/${expense._id}`;
  await notifyUser({
    companyId: expense.companyId || req.companyId,
    userId: submitterId,
    title: 'Expense submitted',
    message: `${expense.category || 'Expense'}${expense.merchant ? ` at ${expense.merchant}` : ''} for ${formatMoney(expense.amount, expense.currency)} was submitted for approval.`,
    category: 'expense',
    actionUrl,
    data: expenseData(expense)
  });

  const roles = getNextApproverRoles(expense.status);
  const recipientIds = [];
  const employeeUser = req.user || (submitterId ? await User.findById(submitterId) : null);

  if (roles.includes('manager')) {
    const managers = await findManagerRecipientsForUser({
      companyId: expense.companyId || req.companyId,
      employee: employeeUser,
      excludeUserIds: [submitterId]
    });
    recipientIds.push(...managers);
  }

  const nonManagerRoles = roles.filter((role) => role !== 'manager');
  if (nonManagerRoles.length) {
    const roleRecipients = await findRoleRecipients({
      companyId: expense.companyId || req.companyId,
      roles: nonManagerRoles,
      excludeUserIds: [req.user?._id, submitterId].filter(Boolean)
    });
    recipientIds.push(...roleRecipients);
  }

  if (recipientIds.length === 0) {
    const managers = await findManagerRecipientsForUser({
      companyId: expense.companyId || req.companyId,
      employee: employeeUser,
      excludeUserIds: [submitterId]
    });
    recipientIds.push(...managers);
  }

  await notifyUsers({
    companyId: expense.companyId || req.companyId,
    userIds: recipientIds,
    excludeUserIds: [req.user?._id, submitterId],
    title: 'New expense needs review',
    message: `${req.user?.name || 'An employee'} submitted ${expense.category || 'an expense'}${expense.merchant ? ` at ${expense.merchant}` : ''} for ${formatMoney(expense.amount, expense.currency)}.`,
    category: 'approval',
    priority: 'high',
    actionUrl,
    data: expenseData(expense, { actorId: req.user?._id, actorName: req.user?.name })
  });
};

export const notifyReportSubmitted = async ({ req, report }) => {
  const submitterId = normalizeId(report.employeeId) || req.user?._id;
  const actionUrl = '/manager/pending-approvals';
  const amount = report.totalAmount || report.total?.amount || 0;
  await notifyUser({
    companyId: report.companyId || req.companyId,
    userId: submitterId,
    title: 'Expense report submitted',
    message: `${report.title || report.reportNo || 'Expense report'} for ${formatMoney(amount, report.currency || report.total?.currency)} was submitted for manager approval.`,
    category: 'approval',
    actionUrl: '/expense-reports',
    data: { kind: 'report', reportId: report._id, reportNo: report.reportNo, status: report.status }
  });

  const recipientIds = await findManagerRecipientsForUser({
    companyId: report.companyId || req.companyId,
    employee: req.user,
    excludeUserIds: [submitterId]
  });

  await notifyUsers({
    companyId: report.companyId || req.companyId,
    userIds: recipientIds,
    excludeUserIds: [req.user?._id, submitterId],
    title: 'New expense report needs review',
    message: `${req.user?.name || 'An employee'} submitted ${report.title || report.reportNo || 'an expense report'} for ${formatMoney(amount, report.currency || report.total?.currency)}.`,
    category: 'approval',
    priority: 'high',
    actionUrl,
    data: { kind: 'report', reportId: report._id, reportNo: report.reportNo, status: report.status, actorId: req.user?._id, actorName: req.user?.name }
  });
};

export const notifyExpenseStatusChanged = async ({ req, expense, action, note }) => {
  const employeeId = normalizeId(expense.employeeId);
  const readableStatus = String(expense.status || '').replaceAll('_', ' ').toLowerCase();
  const actionUrl = `/expenses/${expense._id}`;
  await notifyUser({
    companyId: expense.companyId || req.companyId,
    userId: employeeId,
    title: `Expense ${readableStatus}`,
    message: note || `Your ${expense.category || 'expense'} expense is now ${readableStatus}.`,
    category: 'expense',
    priority: ['rejected', 'sent back'].includes(readableStatus) ? 'high' : 'normal',
    actionUrl,
    data: expenseData(expense, { action, actorId: req.user?._id, actorName: req.user?.name })
  });

  const nextRoles = getNextApproverRoles(expense.status);
  if (nextRoles.length) {
    await notifyRole({
      companyId: expense.companyId || req.companyId,
      roles: nextRoles,
      excludeUserIds: [req.user?._id, employeeId],
      title: 'Expense moved to your queue',
      message: `${expense.category || 'An expense'} is now waiting for ${readableStatus} action.`,
      category: 'approval',
      priority: 'high',
      actionUrl,
      data: expenseData(expense, { actorId: req.user?._id, actorName: req.user?.name })
    });
  }
};

const travelData = (trip, extra = {}) => ({
  kind: 'trip',
  travelRequestId: trip._id,
  tripId: trip._id,
  title: trip.title,
  destination: trip.destination,
  amount: trip.budget?.amount || trip.estimate?.estimatedTotal || 0,
  currency: trip.budget?.currency || 'INR',
  status: trip.status,
  ...extra
});

export const notifyTravelSubmitted = async ({ req, trip }) => {
  const submitterId = normalizeId(trip.employeeId) || req.user?._id;
  const actionUrl = '/travel';
  await notifyUser({
    companyId: trip.companyId || req.companyId,
    userId: submitterId,
    title: 'Travel Request Submitted',
    message: `Your travel request "${trip.title}" to ${trip.destination} for ${formatMoney(trip.budget?.amount || trip.estimate?.estimatedTotal, trip.budget?.currency)} was submitted for approval.`,
    category: 'approval',
    actionUrl,
    data: travelData(trip)
  });

  const roles = getNextApproverRoles(trip.status);
  const recipientIds = [];
  const employeeUser = req.user || (submitterId ? await User.findById(submitterId) : null);

  if (roles.includes('manager')) {
    const managers = await findManagerRecipientsForUser({
      companyId: trip.companyId || req.companyId,
      employee: employeeUser,
      excludeUserIds: [submitterId]
    });
    recipientIds.push(...managers);
  }

  const nonManagerRoles = roles.filter((role) => role !== 'manager');
  if (nonManagerRoles.length) {
    const roleRecipients = await findRoleRecipients({
      companyId: trip.companyId || req.companyId,
      roles: nonManagerRoles,
      excludeUserIds: [req.user?._id, submitterId].filter(Boolean)
    });
    recipientIds.push(...roleRecipients);
  }

  if (recipientIds.length === 0) {
    const managers = await findManagerRecipientsForUser({
      companyId: trip.companyId || req.companyId,
      employee: employeeUser,
      excludeUserIds: [submitterId]
    });
    recipientIds.push(...managers);
  }

  await notifyUsers({
    companyId: trip.companyId || req.companyId,
    userIds: recipientIds,
    excludeUserIds: [req.user?._id, submitterId],
    title: 'New travel request needs review',
    message: `${req.user?.name || 'An employee'} submitted a travel request "${trip.title}" to ${trip.destination} for ${formatMoney(trip.budget?.amount || trip.estimate?.estimatedTotal, trip.budget?.currency)}.`,
    category: 'approval',
    priority: 'high',
    actionUrl: '/manager/trips',
    data: travelData(trip, { actorId: req.user?._id, actorName: req.user?.name })
  });
};

export const notifyTravelStatusChanged = async ({ req, trip, action, note }) => {
  const employeeId = normalizeId(trip.employeeId);
  const readableStatus = String(trip.status || '').replaceAll('_', ' ').toLowerCase();
  const actionUrl = '/travel';
  await notifyUser({
    companyId: trip.companyId || req.companyId,
    userId: employeeId,
    title: `Travel Request ${trip.status}`,
    message: note || `Your travel request "${trip.title}" to ${trip.destination} is now ${readableStatus}.`,
    category: 'approval',
    priority: ['rejected', 'sent back', 'REJECTED', 'DRAFT'].includes(trip.status) ? 'high' : 'normal',
    actionUrl,
    data: travelData(trip, { action, actorId: req.user?._id, actorName: req.user?.name })
  });

  const nextRoles = getNextApproverRoles(trip.status);
  if (nextRoles.length) {
    const nextUrl = String(trip.status || '').includes('FINANCE') || String(trip.status || '').includes('CFO')
      ? '/finance/verification'
      : '/manager/trips';
    await notifyRole({
      companyId: trip.companyId || req.companyId,
      roles: nextRoles,
      excludeUserIds: [req.user?._id, employeeId],
      title: 'Travel request moved to your queue',
      message: `Travel request "${trip.title}" to ${trip.destination} is waiting for ${readableStatus} action.`,
      category: 'approval',
      priority: 'high',
      actionUrl: nextUrl,
      data: travelData(trip, { action, actorId: req.user?._id, actorName: req.user?.name })
    });
  }
};
