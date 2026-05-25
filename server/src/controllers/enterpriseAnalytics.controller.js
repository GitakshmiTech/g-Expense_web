import { asyncHandler } from '../helpers/asyncHandler.js';
import { ApiError } from '../helpers/apiError.js';
import { enterpriseAnalytics } from '../services/enterpriseAnalytics.service.js';

const allowedReports = {
  monthlySpend: 'monthlySpend',
  departmentSpend: 'departmentSpend',
  topSpenders: 'topSpenders',
  budgetUsage: 'budgetUsage',
  approvalDelays: 'approvalDelays',
  violationSummary: 'violationSummary',
  reimbursementAging: 'reimbursementAging',
  auditTrail: 'auditTrail'
};

export const runEnterpriseAnalytics = asyncHandler(async (req, res) => {
  const report = allowedReports[req.params.report];
  if (!report) throw new ApiError(404, 'Analytics report not found');
  if (report === 'auditTrail' && (!req.query.entity || !req.query.entityId)) throw new ApiError(400, 'entity and entityId are required for audit trail');
  res.json(await enterpriseAnalytics[report](req.companyId, req.query));
});
