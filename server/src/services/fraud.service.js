import { Expense } from '../models/Expense.js';
import { FraudLog } from '../models/ExpenseEcosystem.js';

export const detectFraud = async ({ companyId, expense }) => {
  const flags = [];
  const start = new Date(expense.expenseDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(expense.expenseDate);
  end.setHours(23, 59, 59, 999);
  const duplicate = await Expense.findOne({
    companyId,
    employeeId: expense.employeeId,
    merchant: expense.merchant,
    amount: expense.amount,
    expenseDate: { $gte: start, $lte: end },
    _id: { $ne: expense._id }
  });
  if (duplicate) flags.push({ code: 'DUPLICATE_EXPENSE', message: 'Possible duplicate expense detected', score: 85 });
  if (expense.amount > 100000) flags.push({ code: 'HIGH_VALUE', message: 'High value transaction requires finance scrutiny', score: 65 });
  if (expense.receipts?.length === 0 && Number(expense.amount) > 5000) {
    flags.push({ code: 'MISSING_RECEIPT_HIGH_VALUE', message: 'High-value claim has no receipt attached', score: 70 });
  }
  if (expense.expenseDate && new Date(expense.expenseDate) > new Date()) {
    flags.push({ code: 'FUTURE_DATED_EXPENSE', message: 'Expense date is in the future', score: 80 });
  }
  if (flags.length) {
    await FraudLog.insertMany(flags.map((flag) => ({
      companyId,
      expenseId: expense._id,
      employeeId: expense.employeeId?._id || expense.employeeId,
      signal: flag.code,
      message: flag.message,
      score: flag.score,
      severity: flag.score >= 85 ? 'critical' : flag.score >= 70 ? 'high' : 'medium',
      evidence: { merchant: expense.merchant, amount: expense.amount, expenseDate: expense.expenseDate }
    })));
  }
  return flags;
};
