import { Department, ExpenseCategory } from '../models/Enterprise.js';
import { PolicyEngineService } from '../services/policyEngine.service.js';

const roleLimitKeys = (user = {}) => {
  const role = String(user.role || '').toLowerCase();
  const grade = String(user.grade || '').toUpperCase();
  const keys = [user.role, role, grade].filter(Boolean);
  if (role === 'employee') keys.push('L1_ASSOCIATE');
  if (role === 'manager') keys.push('L2_MANAGER', 'L2_MGR');
  if (['finance', 'cfo', 'company_admin', 'super_admin'].includes(role)) keys.push('L3_DIRECTOR', 'L3_DIR');
  return [...new Set(keys)];
};

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

  // Advanced Category-Specific Controls Validation
  const categoryDoc = await ExpenseCategory.findOne({
    companyId,
    $or: [
      { code: expense.category },
      { name: expense.category }
    ]
  });

  if (categoryDoc) {
    if (categoryDoc.active === false) {
      violations.push({
        code: 'CATEGORY_INACTIVE',
        message: `Category ${categoryDoc.name} is inactive and cannot be used for new expenses`,
        severity: 'block'
      });
    }

    // 1. Basic / Role Limits Validation
    if (categoryDoc.limits) {
      const perExpenseLimit = categoryDoc.limits.perExpense || categoryDoc.defaultLimit?.amount || 0;
      if (perExpenseLimit > 0 && expense.amount > perExpenseLimit) {
        violations.push({
          code: 'LIMIT_EXCEEDED',
          message: `Expense amount exceeds per-expense limit of ${perExpenseLimit} for category ${categoryDoc.name}`,
          severity: 'block'
        });
      }

      const roleKey = roleLimitKeys(user).find((key) => categoryDoc.limits.roleBased?.[key]);
      if (roleKey) {
        const roleLimit = Number(categoryDoc.limits.roleBased[roleKey]);
        if (roleLimit > 0 && expense.amount > roleLimit) {
          violations.push({
            code: 'LIMIT_EXCEEDED',
            message: `Expense amount exceeds role-based limit of ${roleLimit} for ${roleKey} in category ${categoryDoc.name}`,
            severity: 'block'
          });
        }
      }
    }

    // 2. Receipt and Tax Compliance
    if (categoryDoc.compliance) {
      const mandatoryReceipt = categoryDoc.compliance.receiptMandatory || (categoryDoc.receiptMandatoryAbove > 0 && expense.amount > categoryDoc.receiptMandatoryAbove);
      if (mandatoryReceipt && count === 0) {
        violations.push({
          code: 'RECEIPT_REQUIRED',
          message: `A receipt is mandatory for category ${categoryDoc.name}`,
          severity: 'block'
        });
      }

      if (categoryDoc.compliance.ocrMandatory && count > 0) {
        // Warning if OCR mandatory but no OCR fields or low confidence
        const ocrRequiredWarning = expense.receipts?.some(r => r.ocr && r.ocr.confidence < 0.6);
        if (ocrRequiredWarning) {
          violations.push({
            code: 'POLICY_WARNING',
            message: `Low OCR Confidence: High-precision OCR is recommended for category ${categoryDoc.name}`,
            severity: 'warning'
          });
        }
      }

      if (categoryDoc.compliance.gstMandatory && !expense.taxAmount) {
        violations.push({
          code: 'GST_REQUIRED',
          message: `GST/Tax details are mandatory for category ${categoryDoc.name}`,
          severity: 'block'
        });
      }
    }

    // 3. Dynamic Custom Fields Check
    if (Array.isArray(categoryDoc.dynamicFields) && categoryDoc.dynamicFields.length > 0) {
      const customData = expense.customFields || {};
      for (const field of categoryDoc.dynamicFields) {
        if (field.isRequired && (customData[field.fieldId] === undefined || customData[field.fieldId] === null || customData[field.fieldId] === '')) {
          violations.push({
            code: 'MISSING_REQUIRED_FIELD',
            message: `Context field '${field.label}' is required for expense category ${categoryDoc.name}`,
            severity: 'block'
          });
        }
      }
    }
  }

  return violations;
};

