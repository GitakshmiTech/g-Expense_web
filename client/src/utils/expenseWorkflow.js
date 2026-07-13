export const normalizeExpenseStatus = (status = '') => {
  const map = {
    draft: 'DRAFT',
    submitted: 'SUBMITTED',
    manager_review: 'PENDING_MANAGER',
    finance_review: 'PENDING_FINANCE',
    cfo_review: 'PENDING_ACCOUNTS',
    approved: 'UNDER_VERIFICATION',
    finance_verified: 'UNDER_VERIFICATION',
    rejected: 'REJECTED',
    sent_back: 'SENT_BACK',
    paid: 'REIMBURSED',
    reimbursed: 'REIMBURSED',
    closed: 'CLOSED'
  };
  return map[String(status || '').toLowerCase()] || String(status || '').toUpperCase();
};

export const DRAFT_STATUSES = ['DRAFT', 'SENT_BACK'];
export const REVIEW_STATUSES = ['SUBMITTED', 'PENDING_MANAGER', 'PENDING_FINANCE', 'PENDING_ACCOUNTS', 'UNDER_VERIFICATION'];
export const TERMINAL_STATUSES = ['REIMBURSED', 'CLOSED', 'REJECTED'];

export const getExpenseStage = (status) => {
  const normalized = normalizeExpenseStatus(status);
  const stages = [
    { key: 'created', label: 'Employee Created', done: true },
    { key: 'submitted', label: 'Submitted', done: !DRAFT_STATUSES.includes(normalized) },
    { key: 'manager', label: 'Manager Approval', active: normalized === 'PENDING_MANAGER', done: ['PENDING_FINANCE', 'PENDING_ACCOUNTS', 'UNDER_VERIFICATION', 'PAYMENT_PROCESSING', 'REIMBURSED', 'CLOSED'].includes(normalized) },
    { key: 'finance', label: 'Finance Verification', active: normalized === 'PENDING_FINANCE' || normalized === 'UNDER_VERIFICATION', done: ['PAYMENT_PROCESSING', 'REIMBURSED', 'CLOSED'].includes(normalized) },
    { key: 'payment', label: 'Reimbursement', active: normalized === 'PAYMENT_PROCESSING', done: ['REIMBURSED', 'CLOSED'].includes(normalized) },
    { key: 'closed', label: 'Closed', active: normalized === 'CLOSED', done: normalized === 'CLOSED' }
  ];
  if (normalized === 'REJECTED') return stages.map((stage) => ({ ...stage, blocked: !stage.done }));
  if (normalized === 'SENT_BACK') return stages.map((stage) => ({ ...stage, active: stage.key === 'submitted' }));
  return stages;
};

export const getNextProcessText = (status) => {
  const normalized = normalizeExpenseStatus(status);
  const map = {
    DRAFT: 'Add receipt/details, then submit the expense for approval.',
    SENT_BACK: 'Update the requested details and resubmit for approval.',
    SUBMITTED: 'Waiting for workflow assignment.',
    PENDING_MANAGER: 'Manager needs to approve, send back, or reject this expense.',
    PENDING_FINANCE: 'Finance needs to verify the bill, tax, policy, and reimbursement details.',
    PENDING_ACCOUNTS: 'Accounts/CFO approval is pending for high-value or exception expense.',
    UNDER_VERIFICATION: 'Finance verification is complete enough to start reimbursement processing.',
    PAYMENT_PROCESSING: 'Payment is being processed. Mark paid after reimbursement is completed.',
    REIMBURSED: 'Employee reimbursement is completed.',
    CLOSED: 'Expense lifecycle is closed.',
    REJECTED: 'Expense was rejected. No further processing is required.'
  };
  return map[normalized] || 'Workflow status is being processed.';
};

export const canActOnExpense = (status, role) => {
  const normalized = normalizeExpenseStatus(status);
  if (DRAFT_STATUSES.includes(normalized)) return ['employee', 'manager', 'finance', 'cfo', 'company_admin', 'super_admin'].includes(role);
  if (normalized === 'PENDING_MANAGER') return ['manager', 'company_admin', 'super_admin'].includes(role);
  if (normalized === 'PENDING_FINANCE' || normalized === 'UNDER_VERIFICATION') return ['finance', 'company_admin', 'super_admin'].includes(role);
  if (normalized === 'PENDING_ACCOUNTS') return ['cfo', 'finance', 'company_admin', 'super_admin'].includes(role);
  if (normalized === 'PAYMENT_PROCESSING' || normalized === 'REIMBURSED') return ['finance', 'company_admin', 'super_admin'].includes(role);
  return false;
};
