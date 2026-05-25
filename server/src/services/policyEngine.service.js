import mongoose from 'mongoose';
import { EnterprisePolicy } from '../models/EnterprisePolicy.js';
import { EnterpriseExpense } from '../models/ExpenseEnterprise.js';
import { ApiError } from '../helpers/apiError.js';

export class PolicyEngineService {
  /**
   * Evaluates an expense against all active policies for a user.
   */
  static async evaluateExpense(expensePayload, userContext) {
    const { companyId, departmentId, designationId, gradeId } = userContext;
    
    // Fetch all active policies for the company that apply to the user
    const query = {
      companyId,
      status: 'active'
    };

    const andConditions = [];

    // Department Mapping
    if (departmentId && mongoose.isValidObjectId(departmentId)) {
      andConditions.push({
        $or: [
          { 'mapping.departmentIds': { $size: 0 } },
          { 'mapping.departmentIds': departmentId }
        ]
      });
    } else {
      andConditions.push({ 'mapping.departmentIds': { $size: 0 } });
    }

    // Designation Mapping
    if (designationId) {
      andConditions.push({
        $or: [
          { 'mapping.designationIds': { $size: 0 } },
          { 'mapping.designationIds': designationId }
        ]
      });
    } else {
      andConditions.push({ 'mapping.designationIds': { $size: 0 } });
    }

    // Grade Mapping
    if (gradeId) {
      andConditions.push({
        $or: [
          { 'mapping.gradeIds': { $size: 0 } },
          { 'mapping.gradeIds': gradeId }
        ]
      });
    } else {
      andConditions.push({ 'mapping.gradeIds': { $size: 0 } });
    }

    query.$and = andConditions;

    const policies = await EnterprisePolicy.find(query).sort({ priority: -1 });

    const results = {
      isValid: true,
      violations: [],
      warnings: [],
      flags: [],
      requiredApprovers: ['Manager'] // Default
    };

    for (const policy of policies) {
      this.validateLimits(expensePayload, policy, results);
      this.validateReceipt(expensePayload, policy, results);
      this.validateCompliance(expensePayload, policy, results);
      this.evaluateCustomRules(expensePayload, policy, results);
      this.determineApprovers(expensePayload, policy, results);
    }

    if (results.violations.length > 0) {
      results.isValid = false;
    }

    return results;
  }

  static validateLimits(expense, policy, results) {
    const { limits } = policy;
    if (!limits) return;

    if (limits.perExpense && expense.amount > limits.perExpense) {
      const msg = `Expense amount exceeds per-expense limit of ${limits.perExpense} ${limits.currency}`;
      if (limits.limitType === 'hard') results.violations.push(msg);
      else results.warnings.push(msg);
    }
    
    // Note: Daily, Weekly, Monthly limits would require historical DB queries.
    // In a full implementation, we would query aggregated past expenses here.
  }

  static validateReceipt(expense, policy, results) {
    const { receiptPolicy } = policy;
    if (!receiptPolicy) return;

    if (receiptPolicy.mandatory && !expense.receiptUrl) {
      if (!receiptPolicy.requiredAboveAmount || expense.amount > receiptPolicy.requiredAboveAmount) {
        results.violations.push(`Receipt is mandatory for amounts above ${receiptPolicy.requiredAboveAmount || 0}`);
      }
    }
  }

  static validateCompliance(expense, policy, results) {
    const { compliance } = policy;
    if (!compliance) return;

    if (compliance.blockedMerchants?.includes(expense.merchant)) {
      results.violations.push(`Merchant '${expense.merchant}' is blocked by policy.`);
    }

    if (compliance.blockedCategories?.includes(expense.category)) {
      results.violations.push(`Category '${expense.category}' is blocked by policy.`);
    }

    if (compliance.futureDateRestriction && new Date(expense.date) > new Date()) {
      results.violations.push('Future dated expenses are not allowed.');
    }

    if (compliance.weekendRestriction && expense.date) {
      const day = new Date(expense.date).getDay();
      if (day === 0 || day === 6) {
        results.violations.push('Expenses incurred on weekends are restricted.');
      }
    }

    if (compliance.gstMandatory && !expense.taxAmount) {
      results.violations.push('GST/Tax amount is mandatory by policy.');
    }
  }

  static evaluateCustomRules(expense, policy, results) {
    const { customRules } = policy;
    if (!customRules || customRules.length === 0) return;

    customRules.forEach(rule => {
      let isMatch = rule.logicalOperator === 'OR' ? false : true;

      rule.conditions.forEach(condition => {
        const val = expense[condition.field];
        let condMatch = false;

        switch (condition.operator) {
          case 'equals': condMatch = val === condition.value; break;
          case 'not_equals': condMatch = val !== condition.value; break;
          case 'greater_than': condMatch = val > condition.value; break;
          case 'less_than': condMatch = val < condition.value; break;
          case 'contains': condMatch = val?.includes(condition.value); break;
          case 'in_array': condMatch = condition.value?.includes(val); break;
        }

        if (rule.logicalOperator === 'AND') isMatch = isMatch && condMatch;
        if (rule.logicalOperator === 'OR') isMatch = isMatch || condMatch;
      });

      if (isMatch) {
        rule.actions.forEach(action => {
          if (action.actionType === 'reject') results.violations.push(`Rule rejection: ${rule.name}`);
          if (action.actionType === 'warn') results.warnings.push(`Rule warning: ${rule.name}`);
          if (action.actionType === 'require_approval' && !results.requiredApprovers.includes(action.actionValue)) {
            results.requiredApprovers.push(action.actionValue);
          }
        });
      }
    });
  }

  static determineApprovers(expense, policy, results) {
    const { approvalFlow } = policy;
    if (!approvalFlow || approvalFlow.length === 0) return;

    // Find highest applicable level
    approvalFlow.forEach(flow => {
      if (
        (!flow.condition.amountGreaterThan || expense.amount > flow.condition.amountGreaterThan) &&
        (!flow.condition.amountLessThan || expense.amount < flow.condition.amountLessThan)
      ) {
        flow.approvers.forEach(approver => {
          if (!results.requiredApprovers.includes(approver)) {
            results.requiredApprovers.push(approver);
          }
        });
      }
    });
  }
}
