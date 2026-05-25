import { Reimbursement } from '../models/Enterprise.js';

export const createReimbursementForExpense = async ({ req, expense, method = 'bank_transfer' }) => {
  return Reimbursement.create({
    companyId: req.companyId,
    employeeId: expense.employeeId?._id || expense.employeeId,
    amount: expense.convertedAmount || expense.amount,
    currency: expense.baseCurrency || expense.currency || 'INR',
    method,
    status: 'pending',
    createdBy: req.user?._id
  });
};

export const markPaymentProcessing = async ({ reimbursement, reference, method }) => {
  reimbursement.status = 'processing';
  reimbursement.reference = reference || reimbursement.reference;
  reimbursement.method = method || reimbursement.method;
  reimbursement.lastAttemptAt = new Date();
  await reimbursement.save();
  return reimbursement;
};

export const markPaid = async ({ reimbursement, reference }) => {
  reimbursement.status = 'paid';
  reimbursement.reference = reference || reimbursement.reference;
  reimbursement.paidAt = new Date();
  await reimbursement.save();
  return reimbursement;
};
