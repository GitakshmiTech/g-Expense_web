import { expenseAnalyticsPipelines } from '../aggregations/expense.analytics.js';
import { EnterpriseAuditLog, EnterpriseBudget, EnterpriseExpense, EnterpriseReimbursement, EnterpriseViolation } from '../models/ExpenseEnterprise.js';
import { EnterpriseRepository } from '../repositories/enterprise.repository.js';

const expenseRepo = new EnterpriseRepository(EnterpriseExpense);
const budgetRepo = new EnterpriseRepository(EnterpriseBudget);
const violationRepo = new EnterpriseRepository(EnterpriseViolation);
const reimbursementRepo = new EnterpriseRepository(EnterpriseReimbursement);
const auditRepo = new EnterpriseRepository(EnterpriseAuditLog);

const dateRange = (query) => ({
  start: query.start ? new Date(query.start) : new Date(new Date().getFullYear(), 0, 1),
  end: query.end ? new Date(query.end) : new Date()
});

export const enterpriseAnalytics = {
  monthlySpend(companyId, query) {
    return expenseRepo.aggregate(expenseAnalyticsPipelines.monthlySpend({ companyId, ...dateRange(query), departmentId: query.departmentId, employeeId: query.employeeId }));
  },

  departmentSpend(companyId, query) {
    return expenseRepo.aggregate(expenseAnalyticsPipelines.departmentSpend({ companyId, ...dateRange(query) }));
  },

  topSpenders(companyId, query) {
    return expenseRepo.aggregate(expenseAnalyticsPipelines.topSpenders({ companyId, ...dateRange(query), limit: Number(query.limit || 10) }));
  },

  budgetUsage(companyId, query) {
    return budgetRepo.aggregate(expenseAnalyticsPipelines.budgetUsage({ companyId, periodStart: query.start ? new Date(query.start) : new Date(), periodEnd: query.end ? new Date(query.end) : new Date() }));
  },

  approvalDelays(companyId, query) {
    return auditRepo.aggregate(expenseAnalyticsPipelines.approvalDelays({ companyId, approverId: query.approverId }));
  },

  violationSummary(companyId, query) {
    return violationRepo.aggregate(expenseAnalyticsPipelines.violationSummary({ companyId, ...dateRange(query) }));
  },

  reimbursementAging(companyId) {
    return reimbursementRepo.aggregate(expenseAnalyticsPipelines.reimbursementAging({ companyId }));
  },

  auditTrail(companyId, query) {
    return auditRepo.aggregate(expenseAnalyticsPipelines.auditTrail({ companyId, entity: query.entity, entityId: query.entityId }));
  }
};
