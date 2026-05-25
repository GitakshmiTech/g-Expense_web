import { Department } from '../models/Enterprise.js';
import { PolicyEngineService } from '../services/policyEngine.service.js';

export const evaluateExpensePolicy = async ({ companyId, user, expense, receiptCount }) => {
  // Resolve department ID from user department string
  let departmentId = null;
  if (user.department) {
    const dept = await Department.findOne({
      companyId,
      $or: [
        { name: user.department },
        { code: user.department }
      ]
    });
    if (dept) {
      departmentId = dept._id;
    }
  }

  // Build the user context
  const userContext = {
    companyId,
    departmentId,
    designationId: user.designation,
    gradeId: user.grade,
    role: user.role
  };

  // Build expense payload for engine
  const count = receiptCount !== undefined ? receiptCount : (expense.receipts?.length || 0);
  const expensePayload = {
    amount: expense.amount,
    currency: expense.currency || 'INR',
    category: expense.category,
    merchant: expense.merchant,
    date: expense.expenseDate || expense.createdAt || new Date(),
    receiptUrl: count > 0 ? 'exists' : null,
    taxAmount: expense.taxAmount
  };

  // Evaluate using the new PolicyEngineService
  const result = await PolicyEngineService.evaluateExpense(expensePayload, userContext);

  const violations = [];

  // Map violations (hard limits/violations)
  result.violations.forEach(msg => {
    let code = 'POLICY_VIOLATION';
    if (msg.toLowerCase().includes('limit')) code = 'LIMIT_EXCEEDED';
    else if (msg.toLowerCase().includes('receipt')) code = 'RECEIPT_REQUIRED';
    else if (msg.toLowerCase().includes('merchant')) code = 'BLOCKED_MERCHANT';
    else if (msg.toLowerCase().includes('category')) code = 'BLOCKED_CATEGORY';
    else if (msg.toLowerCase().includes('weekend')) code = 'WEEKEND_RESTRICTED';
    else if (msg.toLowerCase().includes('gst') || msg.toLowerCase().includes('tax')) code = 'GST_REQUIRED';

    violations.push({
      code,
      message: msg,
      severity: 'block'
    });
  });

  // Map warnings
  result.warnings.forEach(msg => {
    let code = 'POLICY_WARNING';
    if (msg.toLowerCase().includes('limit')) code = 'LIMIT_EXCEEDED';
    else if (msg.toLowerCase().includes('receipt')) code = 'RECEIPT_REQUIRED';
    else if (msg.toLowerCase().includes('merchant')) code = 'BLOCKED_MERCHANT';
    else if (msg.toLowerCase().includes('category')) code = 'BLOCKED_CATEGORY';
    else if (msg.toLowerCase().includes('weekend')) code = 'WEEKEND_RESTRICTED';
    else if (msg.toLowerCase().includes('gst') || msg.toLowerCase().includes('tax')) code = 'GST_REQUIRED';

    violations.push({
      code,
      message: msg,
      severity: 'warning'
    });
  });

  return violations;
};

