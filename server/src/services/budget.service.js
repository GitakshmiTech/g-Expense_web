import { Budget } from '../models/Budget.js';
import { enqueueNotification } from '../jobs/queue.js';

export const consumeBudgetForExpense = async ({ companyId, expense, employee }) => {
  const budget = await Budget.findOne({
    companyId,
    status: 'active',
    $or: [{ type: 'department', department: employee?.department }, { type: 'project', projectCode: expense.project }]
  }).sort({ type: 1 });
  if (!budget) return null;

  budget.consumed = Number(budget.consumed || 0) + Number(expense.convertedAmount || expense.amount || 0);
  await budget.save();

  const consumedPercent = budget.amount ? (budget.consumed / budget.amount) * 100 : 0;
  const crossedThreshold = [...(budget.thresholds || [])].sort((a, b) => b.percentage - a.percentage).find((threshold) => consumedPercent >= threshold.percentage);
  if (crossedThreshold) {
    await enqueueNotification({
      companyId,
      title: `Budget ${Math.round(consumedPercent)}% consumed`,
      message: `${budget.name} crossed ${crossedThreshold.percentage}% consumption`,
      data: { budgetId: budget._id, expenseId: expense._id }
    });
  }

  return budget;
};
