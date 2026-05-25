import { Approval } from '../models/Enterprise.js';
import { nextStatusFromApprovalPath } from '../constants/expenseLifecycle.js';

export const persistApprovalPath = async ({ companyId, module, recordId, approvalPath }) => {
  await Approval.deleteMany({ companyId, module, recordId });
  if (!approvalPath?.length) return [];
  return Approval.insertMany(approvalPath.map((step, index) => ({
    companyId,
    module,
    recordId,
    step: index + 1,
    approverRole: step.approverRole,
    approverId: step.approverId,
    status: step.status || 'pending'
  })));
};

export const applyApprovalAction = async ({ record, action, note, actorId }) => {
  const allowedActions = ['approve', 'verify', 'reject', 'send_back', 'hold'];
  if (!allowedActions.includes(action)) {
    throw new Error(`Unsupported approval action '${action}'`);
  }
  const actionableStatuses = ['PENDING_MANAGER', 'PENDING_FINANCE', 'PENDING_ACCOUNTS', 'UNDER_VERIFICATION', 'manager_review', 'finance_review', 'cfo_review'];
  if (!actionableStatuses.includes(record.status)) {
    throw new Error(`Cannot ${action} record with status '${record.status}'`);
  }
  const current = record.approvalPath?.find((step) => step.status === 'pending');

  if (action === 'reject') {
    if (current) Object.assign(current, { status: 'rejected', approverId: actorId, actedAt: new Date(), note });
    record.status = 'REJECTED';
    return record;
  }

  if (action === 'send_back' || action === 'hold') {
    if (current) Object.assign(current, { status: action === 'hold' ? 'escalated' : 'sent_back', approverId: actorId, actedAt: new Date(), note });
    record.status = action === 'hold' ? 'UNDER_VERIFICATION' : 'SENT_BACK';
    return record;
  }

  if (action === 'approve' || action === 'verify') {
    if (current) Object.assign(current, { status: 'approved', approverId: actorId, actedAt: new Date(), note });
    record.status = nextStatusFromApprovalPath(record.approvalPath);
  }

  return record;
};
