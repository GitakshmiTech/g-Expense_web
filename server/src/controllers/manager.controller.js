import { asyncHandler } from '../helpers/asyncHandler.js';
import { ApiError } from '../helpers/apiError.js';
import { Notification } from '../models/Notification.js';
import {
  buildManagerAnalytics,
  buildManagerDashboard,
  getTeamExpenseDetails,
  listManagerBudgets,
  listManagerPendingApprovals,
  listManagerReports,
  listManagerTrips,
  listManagerViolations,
  listTeamExpenses,
  managerAction,
  managerBulkAction
} from '../services/manager.service.js';

export const managerDashboard = asyncHandler(async (req, res) => {
  res.json(await buildManagerDashboard({ req }));
});

export const managerTeamExpenses = asyncHandler(async (req, res) => {
  res.json(await listTeamExpenses({ req, query: req.query }));
});

export const managerExpenseDetails = asyncHandler(async (req, res) => {
  const result = await getTeamExpenseDetails({ req, id: req.params.id });
  if (!result) throw new ApiError(404, 'Team expense not found');
  res.json(result);
});

export const managerPendingApprovals = asyncHandler(async (req, res) => {
  res.json(await listManagerPendingApprovals({ req }));
});

export const managerApprovalAction = asyncHandler(async (req, res) => {
  const result = await managerAction({ req, ...req.body });
  if (!result) throw new ApiError(404, 'Approval target not found');
  res.json(result);
});

export const managerBulkApprovalAction = asyncHandler(async (req, res) => {
  res.json(await managerBulkAction({ req, ...req.body }));
});

export const managerReports = asyncHandler(async (req, res) => {
  res.json(await listManagerReports({ req, query: req.query }));
});

export const managerTrips = asyncHandler(async (req, res) => {
  res.json(await listManagerTrips({ req }));
});

export const managerTripAction = asyncHandler(async (req, res) => {
  const result = await managerAction({ req, targetType: 'trip', id: req.params.id, action: req.body.action, note: req.body.note });
  if (!result) throw new ApiError(404, 'Trip not found');
  res.json(result);
});

export const managerBudgets = asyncHandler(async (req, res) => {
  res.json(await listManagerBudgets({ req }));
});

export const managerViolations = asyncHandler(async (req, res) => {
  res.json(await listManagerViolations({ req }));
});

export const managerAnalytics = asyncHandler(async (req, res) => {
  res.json(await buildManagerAnalytics({ req }));
});

export const managerNotifications = asyncHandler(async (req, res) => {
  res.json(await Notification.find({ companyId: req.companyId, userId: req.user._id }).sort({ createdAt: -1 }).limit(100));
});
