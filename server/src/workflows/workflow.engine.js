import mongoose from 'mongoose';
import { Workflow } from '../models/Workflow.js';
import { EnterprisePolicy } from '../models/EnterprisePolicy.js';
import { Department } from '../models/Enterprise.js';
import { User } from '../models/User.js';

const compare = (actual, operator, expected) => {
  if (operator === '>') return Number(actual) > Number(expected);
  if (operator === '>=') return Number(actual) >= Number(expected);
  if (operator === '<') return Number(actual) < Number(expected);
  if (operator === '<=') return Number(actual) <= Number(expected);
  if (operator === '==') return String(actual) === String(expected);
  if (operator === 'in') return Array.isArray(expected) && expected.includes(actual);
  return false;
};

export const resolveExpenseWorkflow = async (companyId, expense) => {
  try {
    const userId = expense.employeeId?._id || expense.employeeId || expense.createdBy;
    const user = await User.findById(userId);
    if (user) {
      let departmentId = null;
      if (user.department) {
        const dept = await Department.findOne({
          companyId,
          $or: [{ name: user.department }, { code: user.department }]
        });
        if (dept) departmentId = dept._id;
      }

      // Fetch active policies mapping to this user
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
      if (user.designation) {
        andConditions.push({
          $or: [
            { 'mapping.designationIds': { $size: 0 } },
            { 'mapping.designationIds': user.designation }
          ]
        });
      } else {
        andConditions.push({ 'mapping.designationIds': { $size: 0 } });
      }

      query.$and = andConditions;

      const policies = await EnterprisePolicy.find(query).sort({ priority: -1 });

      if (policies.length > 0) {
        // Start with default manager approval
        const requiredApprovers = ['manager'];

        for (const policy of policies) {
          // Check standard approval flow
          if (policy.approvalFlow && policy.approvalFlow.length > 0) {
            policy.approvalFlow.forEach(flow => {
              if (
                (!flow.condition.amountGreaterThan || expense.amount > flow.condition.amountGreaterThan) &&
                (!flow.condition.amountLessThan || expense.amount < flow.condition.amountLessThan)
              ) {
                flow.approvers.forEach(approver => {
                  const roleKey = approver.toLowerCase();
                  if (!requiredApprovers.includes(roleKey)) {
                    requiredApprovers.push(roleKey);
                  }
                });
              }
            });
          }

          // Check custom rules
          if (policy.customRules && policy.customRules.length > 0) {
            policy.customRules.forEach(rule => {
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
                  if (action.actionType === 'require_approval') {
                    const roleKey = String(action.actionValue).toLowerCase();
                    if (!requiredApprovers.includes(roleKey)) {
                      requiredApprovers.push(roleKey);
                    }
                  }
                });
              }
            });
          }
        }

        if (requiredApprovers.length > 0) {
          return requiredApprovers.map(role => ({
            approverRole: role,
            status: 'pending'
          }));
        }
      }
    }
  } catch (err) {
    console.error('Error resolving policy-driven workflow:', err);
  }

  // Fallback to standard/legacy Workflow engine
  const workflow = await Workflow.findOne({ companyId, module: 'expense', active: true }).sort({ createdAt: -1 });
  if (!workflow) return [{ approverRole: 'manager', status: 'pending' }];
  for (const rule of workflow.rules) {
    const matched = compare(expense[rule.when.field], rule.when.operator, rule.when.value);
    const approvals = matched ? rule.approvals : rule.elseApprovals;
    if (approvals?.length) {
      return approvals.map((step) => ({
        approverRole: step.role.toLowerCase(),
        status: 'pending'
      }));
    }
  }
  return [{ approverRole: 'manager', status: 'pending' }];
};
