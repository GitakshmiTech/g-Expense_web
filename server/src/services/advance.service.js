import { AdvanceRequest } from '../models/ExpenseEcosystem.js';

const nextAdvanceNo = () => `ADV-${Date.now().toString(36).toUpperCase()}`;

export const createAdvanceRequest = async ({ req, payload }) => {
  return AdvanceRequest.create({
    ...payload,
    companyId: req.companyId,
    employeeId: req.user._id,
    advanceNo: nextAdvanceNo(),
    createdBy: req.user._id,
    requested: {
      amount: Number(payload.requested?.amount || payload.amount || 0),
      currency: payload.requested?.currency || payload.currency || 'INR'
    },
    status: payload.status === 'SUBMITTED' ? 'PENDING_MANAGER' : 'DRAFT',
    approvalPath: payload.status === 'SUBMITTED'
      ? [{ approverRole: 'manager', status: 'pending' }, { approverRole: 'finance', status: 'pending' }]
      : []
  });
};

export const settleAdvance = async ({ advance, expenseTotal }) => {
  const released = Number(advance.released?.amount || advance.requested?.amount || 0);
  const delta = Number(expenseTotal || 0) - released;
  advance.adjustedAmount = Math.abs(delta);
  advance.settlementType = delta > 0 ? 'extra_reimbursement' : delta < 0 ? 'refund_recovery' : 'exact_settlement';
  advance.status = 'SETTLED';
  await advance.save();
  return advance;
};
