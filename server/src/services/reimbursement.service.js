import { Reimbursement } from '../models/Enterprise.js';

export const createReimbursementForExpense = async ({ req, expense, method = 'bank_transfer' }) => {
  const employeeId = expense.employeeId?._id || expense.employeeId;
  const amount = expense.convertedAmount || expense.amount;
  return Reimbursement.findOneAndUpdate(
    { companyId: req.companyId, expenseId: expense._id, employeeId },
    {
      $setOnInsert: {
        companyId: req.companyId,
        expenseId: expense._id,
        employeeId,
        amount,
        currency: expense.baseCurrency || expense.currency || 'INR',
        method,
        status: 'pending',
        createdBy: req.user?._id
      },
      $set: {
        updatedBy: req.user?._id
      }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
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
