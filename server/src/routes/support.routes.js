import { Router } from 'express';
import { ApiError } from '../helpers/apiError.js';
import { asyncHandler } from '../helpers/asyncHandler.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { enforceTenant, tenantFilter } from '../middleware/tenant.middleware.js';
import { notifyRole, notifyUser } from '../notification/notification.service.js';
import { SupportTicket } from '../models/SupportTicket.js';
import { User } from '../models/User.js';

export const supportRoutes = Router();

const SUPPORT_CATEGORIES = [
  { value: 'Expense Submission', desk: 'manager' },
  { value: 'OCR Scanning', desk: 'finance' },
  { value: 'Payments', desk: 'finance' },
  { value: 'Trips & Travel', desk: 'manager' },
  { value: 'Policy/Violations', desk: 'finance' },
  { value: 'Account/Login', desk: 'company_admin' },
  { value: 'Other', desk: 'company_admin' }
];

const SUPPORT_SEVERITIES = [
  { value: 'low', label: 'Low - General query' },
  { value: 'medium', label: 'Medium - Functional bug' },
  { value: 'high', label: 'High - Blocked transaction' }
];

const FAQS = [
  {
    id: 'submit-expense',
    question: 'How do I submit a new business expense?',
    answer: 'Open My Expenses, create the expense, attach the receipt if required by the category, then submit it for manager approval.'
  },
  {
    id: 'sent-back',
    question: 'Why is my expense marked as Sent Back?',
    answer: 'A manager or finance reviewer sends an item back when details, receipt, policy validation, or accounting information needs correction.'
  },
  {
    id: 'reimbursement-time',
    question: 'How long does reimbursement processing take?',
    answer: 'After manager approval and finance verification, reimbursements move to the payment queue and remain visible in Reimbursements.'
  },
  {
    id: 'trip-link',
    question: 'How do I link an expense to a Business Trip?',
    answer: 'Create or open a trip, then select that trip while creating the expense so budget usage and approval context stay connected.'
  },
  {
    id: 'support-routing',
    question: 'Who receives my support ticket?',
    answer: 'Expense and trip questions go to the manager queue, finance/payment/OCR/policy questions go to finance, and account or general issues go to company admin.'
  }
];

const deskForCategory = (category) => SUPPORT_CATEGORIES.find((item) => item.value === category)?.desk || 'company_admin';

const ticketNo = () => `TKT-${Date.now().toString(36).toUpperCase()}`;

const canManageTicket = (req, ticket) => {
  const role = req.user.role;
  if (['super_admin', 'company_admin'].includes(role)) return true;
  if (['finance', 'cfo'].includes(role)) return ticket.assignedRole === 'finance';
  if (role === 'manager') return String(ticket.assignedTo || '') === String(req.user._id);
  return false;
};

const visibilityFilter = async (req) => {
  const base = tenantFilter(req);
  const role = req.user.role;
  if (['super_admin', 'company_admin'].includes(role)) return base;
  if (['finance', 'cfo'].includes(role)) {
    return { ...base, $or: [{ employeeId: req.user._id }, { assignedRole: 'finance' }] };
  }
  if (role === 'manager') {
    const teamMembers = await User.find({ ...base, managerId: req.user._id }).select('_id').lean();
    return {
      ...base,
      $or: [{ employeeId: req.user._id }, { employeeId: { $in: teamMembers.map((user) => user._id) } }, { assignedTo: req.user._id }]
    };
  }
  return { ...base, employeeId: req.user._id };
};

const notifyDesk = async ({ req, ticket }) => {
  const companyId = ticket.companyId || req.companyId;
  const ownerName = req.user?.name || 'An employee';
  const actionUrl = '/support';

  await notifyUser({
    companyId,
    userId: ticket.employeeId,
    title: 'Support ticket created',
    message: `${ticket.ticketNo} was created and routed to ${ticket.assignedRole.replace('_', ' ')} support.`,
    category: 'support',
    actionUrl,
    data: { kind: 'support_ticket', ticketId: ticket._id, ticketNo: ticket.ticketNo, status: ticket.status }
  });

  if (ticket.assignedTo) {
    await notifyUser({
      companyId,
      userId: ticket.assignedTo,
      title: 'New support ticket assigned',
      message: `${ownerName} raised ${ticket.ticketNo}: ${ticket.subject}`,
      category: 'support',
      priority: ticket.severity === 'high' ? 'high' : 'normal',
      actionUrl,
      data: { kind: 'support_ticket', ticketId: ticket._id, ticketNo: ticket.ticketNo, status: ticket.status }
    });
    return;
  }

  const roles = ticket.assignedRole === 'finance' ? ['finance', 'cfo', 'company_admin'] : ['company_admin'];
  await notifyRole({
    companyId,
    roles,
    excludeUserIds: [req.user?._id],
    title: 'New support ticket needs review',
    message: `${ownerName} raised ${ticket.ticketNo}: ${ticket.subject}`,
    category: 'support',
    priority: ticket.severity === 'high' ? 'high' : 'normal',
    actionUrl,
    data: { kind: 'support_ticket', ticketId: ticket._id, ticketNo: ticket.ticketNo, status: ticket.status }
  });
};

supportRoutes.use(authenticate, enforceTenant);

supportRoutes.get('/options', (_req, res) => {
  res.json({ categories: SUPPORT_CATEGORIES.map(({ value }) => value), severities: SUPPORT_SEVERITIES });
});

supportRoutes.get('/faqs', (_req, res) => {
  res.json(FAQS);
});

supportRoutes.get('/tickets', asyncHandler(async (req, res) => {
  const tickets = await SupportTicket.find(await visibilityFilter(req))
    .populate('employeeId', 'name email department')
    .populate('assignedTo', 'name email role')
    .populate('comments.actorId', 'name role')
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  res.json(tickets);
}));

supportRoutes.post('/tickets', asyncHandler(async (req, res) => {
  const { category, subject, description, severity = 'low' } = req.body;
  if (!req.companyId && !req.body.companyId) throw new ApiError(400, 'Company context is required to create support ticket');
  if (!category || !subject || !description) throw new ApiError(400, 'Category, subject and description are required');
  if (!SUPPORT_CATEGORIES.some((item) => item.value === category)) throw new ApiError(400, 'Invalid support category');
  if (!SUPPORT_SEVERITIES.some((item) => item.value === severity)) throw new ApiError(400, 'Invalid urgency');

  const requestedDesk = deskForCategory(category);
  const assignedTo = requestedDesk === 'manager' ? req.user.managerId : undefined;
  const assignedRole = requestedDesk === 'manager' && !assignedTo ? 'company_admin' : requestedDesk;
  const ticket = await SupportTicket.create({
    companyId: req.companyId || req.body.companyId,
    ticketNo: ticketNo(),
    employeeId: req.user._id,
    category,
    subject,
    description,
    severity,
    assignedRole,
    assignedTo,
    createdBy: req.user._id,
    updatedBy: req.user._id
  });

  await notifyDesk({ req, ticket });
  const populated = await SupportTicket.findById(ticket._id)
    .populate('employeeId', 'name email department')
    .populate('assignedTo', 'name email role')
    .lean();
  res.status(201).json(populated);
}));

supportRoutes.patch('/tickets/:id', asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findOne({ _id: req.params.id, ...tenantFilter(req) });
  if (!ticket) throw new ApiError(404, 'Support ticket not found');
  if (!canManageTicket(req, ticket)) throw new ApiError(403, 'You cannot update this support ticket');

  const { status, assignedTo, note } = req.body;
  if (status) {
    if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) throw new ApiError(400, 'Invalid ticket status');
    ticket.status = status;
    if (status === 'resolved') ticket.resolvedAt = new Date();
    if (status === 'closed') ticket.closedAt = new Date();
  }
  if (assignedTo) ticket.assignedTo = assignedTo;
  if (note) ticket.comments.push({ actorId: req.user._id, actorRole: req.user.role, body: note });
  ticket.updatedBy = req.user._id;
  await ticket.save();

  await notifyUser({
    companyId: ticket.companyId,
    userId: ticket.employeeId,
    title: `Support ticket ${ticket.status.replace('_', ' ')}`,
    message: `${ticket.ticketNo} is now ${ticket.status.replace('_', ' ')}.`,
    category: 'support',
    priority: ticket.status === 'closed' ? 'normal' : 'high',
    actionUrl: '/support',
    data: { kind: 'support_ticket', ticketId: ticket._id, ticketNo: ticket.ticketNo, status: ticket.status }
  });

  res.json(await SupportTicket.findById(ticket._id).populate('employeeId', 'name email department').populate('assignedTo', 'name email role').lean());
}));

supportRoutes.post('/tickets/:id/comments', asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findOne({ _id: req.params.id, ...tenantFilter(req) });
  if (!ticket) throw new ApiError(404, 'Support ticket not found');
  const isOwner = String(ticket.employeeId) === String(req.user._id);
  if (!isOwner && !canManageTicket(req, ticket)) throw new ApiError(403, 'You cannot comment on this ticket');
  if (!req.body.body) throw new ApiError(400, 'Comment is required');

  ticket.comments.push({ actorId: req.user._id, actorRole: req.user.role, body: req.body.body, internal: Boolean(req.body.internal && !isOwner) });
  ticket.updatedBy = req.user._id;
  await ticket.save();

  if (!isOwner) {
    await notifyUser({
      companyId: ticket.companyId,
      userId: ticket.employeeId,
      title: 'Support ticket updated',
      message: `${ticket.ticketNo} received a new response.`,
      category: 'support',
      actionUrl: '/support',
      data: { kind: 'support_ticket', ticketId: ticket._id, ticketNo: ticket.ticketNo, status: ticket.status }
    });
  }

  res.json(await SupportTicket.findById(ticket._id).populate('employeeId', 'name email department').populate('assignedTo', 'name email role').populate('comments.actorId', 'name role').lean());
}));
