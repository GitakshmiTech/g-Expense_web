export const EXPENSE_STATUSES = [
  'DRAFT',
  'OCR_PROCESSING',
  'VALIDATING',
  'SUBMITTED',
  'PENDING_MANAGER',
  'PENDING_FINANCE',
  'PENDING_ACCOUNTS',
  'REJECTED',
  'SENT_BACK',
  'UNDER_VERIFICATION',
  'PAYMENT_PROCESSING',
  'REIMBURSED',
  'CLOSED'
];

export const LEGACY_STATUS_MAP = {
  draft: 'DRAFT',
  submitted: 'SUBMITTED',
  manager_review: 'PENDING_MANAGER',
  finance_review: 'PENDING_FINANCE',
  cfo_review: 'PENDING_ACCOUNTS',
  approved: 'UNDER_VERIFICATION',
  rejected: 'REJECTED',
  sent_back: 'SENT_BACK',
  paid: 'REIMBURSED',
  reimbursed: 'REIMBURSED',
  closed: 'CLOSED'
};

export const normalizeExpenseStatus = (status = 'DRAFT') => {
  const text = String(status || 'DRAFT');
  return LEGACY_STATUS_MAP[text] || text.toUpperCase();
};

export const REVIEW_STATUS_BY_ROLE = {
  manager: 'PENDING_MANAGER',
  senior_manager: 'PENDING_MANAGER',
  finance: 'PENDING_FINANCE',
  accounts: 'PENDING_ACCOUNTS',
  cfo: 'PENDING_ACCOUNTS',
  director: 'PENDING_ACCOUNTS'
};

export const nextStatusFromApprovalPath = (approvalPath = []) => {
  const next = approvalPath.find((step) => step.status === 'pending');
  return next ? REVIEW_STATUS_BY_ROLE[next.approverRole] || 'PENDING_MANAGER' : 'UNDER_VERIFICATION';
};
