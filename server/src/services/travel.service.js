import { TravelRequest } from '../models/ExpenseEcosystem.js';

const nextTravelId = () => `TRV-${Date.now().toString(36).toUpperCase()}`;

export const createTravelRequest = async ({ req, payload }) => {
  const request = await TravelRequest.create({
    ...payload,
    companyId: req.companyId,
    employeeId: req.user._id,
    travelId: nextTravelId(),
    createdBy: req.user._id,
    budget: {
      amount: Number(payload.budget?.amount || payload.estimatedCost || 0),
      currency: payload.budget?.currency || payload.currency || 'INR'
    },
    status: payload.status === 'SUBMITTED' ? 'PENDING_MANAGER' : 'DRAFT',
    approvalPath: payload.status === 'SUBMITTED' ? [{ approverRole: 'manager', status: 'pending' }] : []
  });
  return request;
};

export const settleTravelRequest = async ({ request, expenses }) => {
  const total = expenses.reduce((sum, expense) => sum + Number(expense.convertedAmount || expense.amount || 0), 0);
  request.status = 'SETTLED';
  request.linkedExpenses = expenses.map((expense) => expense._id);
  request.actualSpend = { amount: total, currency: request.budget?.currency || 'INR' };
  await request.save();
  return request;
};
