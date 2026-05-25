export const RBAC_ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'export', 'manage'];

export const COMPANY_ADMIN_PAGES = [
  { key: 'dashboard', label: 'Dashboard', path: '/', actions: ['view'], order: 10 },
  { key: 'employees', label: 'Employees', path: '/settings/employees', actions: ['view', 'create', 'edit', 'delete', 'manage'], order: 20 },
  { key: 'departments', label: 'Departments', path: '/departments', actions: ['view', 'create', 'edit', 'delete'], order: 30 },
  { key: 'roles_permissions', label: 'Roles & Permissions', path: '/roles-permissions', actions: ['view', 'create', 'edit', 'delete', 'manage'], order: 40 },
  { key: 'expense_categories', label: 'Expense Categories', path: '/expense-categories', actions: ['view', 'create', 'edit', 'delete', 'manage'], order: 50 },
  { key: 'policies', label: 'Policies', path: '/policies', actions: ['view', 'create', 'edit', 'delete', 'approve', 'manage'], order: 60 },
  { key: 'approval_workflow', label: 'Approval Workflow', path: '/settings/workflows', actions: ['view', 'create', 'edit', 'delete', 'approve', 'manage'], order: 70 },
  { key: 'expense_reports', label: 'Expense Reports', path: '/expense-reports', actions: ['view', 'approve', 'export'], order: 80 },
  { key: 'trips', label: 'Trips', path: '/travel', actions: ['view', 'create', 'edit', 'delete', 'approve', 'export'], order: 90 },
  { key: 'advances', label: 'Advances', path: '/advances', actions: ['view', 'create', 'edit', 'delete', 'approve', 'export'], order: 100 },
  { key: 'reimbursements', label: 'Reimbursements', path: '/reimbursements', actions: ['view', 'create', 'edit', 'delete', 'approve', 'export'], order: 110 },
  { key: 'budgets', label: 'Budgets', path: '/budgets', actions: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'manage'], order: 120 },
  { key: 'ocr_receipts', label: 'OCR Receipt Management', path: '/ocr-receipts', actions: ['view', 'edit', 'delete', 'manage'], order: 130 },
  { key: 'notifications', label: 'Notifications', path: '/notifications', actions: ['view', 'create', 'edit', 'delete', 'manage'], order: 140 },
  { key: 'audit_logs', label: 'Audit Logs', path: '/audit-logs', actions: ['view', 'export'], order: 150 },
  { key: 'violation_center', label: 'Violation Center', path: '/violation-center', actions: ['view', 'edit', 'approve', 'export', 'manage'], order: 160 },
  { key: 'analytics', label: 'Analytics', path: '/analytics', actions: ['view', 'export'], order: 170 },
  { key: 'settings', label: 'Settings', path: '/settings', actions: ['view', 'edit', 'manage'], order: 180 }
];

export const MODULE_PAGE_MAP = {
  departments: 'departments',
  roles: 'roles_permissions',
  permissions: 'roles_permissions',
  expense_categories: 'expense_categories',
  policies: 'policies',
  approval_workflows: 'approval_workflow',
  expense_reports: 'expense_reports',
  trips: 'trips',
  advances: 'advances',
  reimbursements: 'reimbursements',
  budgets: 'budgets',
  ocr_logs: 'ocr_receipts',
  notifications: 'notifications',
  audit: 'audit_logs',
  audit_logs: 'audit_logs',
  activity_logs: 'audit_logs',
  violation_center: 'violation_center',
  analytics: 'analytics',
  settings: 'settings',
  employees: 'employees'
};

const EMPLOYEE_DEFAULT_GRANTS = [
  { page: 'dashboard', action: 'view' },
  { page: 'expense_reports', action: 'view' },
  { page: 'trips', action: 'view' },
  { page: 'trips', action: 'create' },
  { page: 'trips', action: 'edit' },
  { page: 'trips', action: 'delete' },
  { page: 'reimbursements', action: 'view' },
  { page: 'notifications', action: 'view' },
  { page: 'settings', action: 'view' },
  { page: 'settings', action: 'edit' }
];

export const DEFAULT_ROLE_GRANTS = {
  company_admin: COMPANY_ADMIN_PAGES.flatMap((page) => page.actions.map((action) => ({ page: page.key, action }))),
  manager: [
    ...EMPLOYEE_DEFAULT_GRANTS,
    { page: 'expense_reports', action: 'approve' },
    { page: 'trips', action: 'approve' },
    { page: 'budgets', action: 'view' },
    { page: 'violation_center', action: 'view' },
    { page: 'analytics', action: 'view' }
  ],
  finance: [
    ...EMPLOYEE_DEFAULT_GRANTS,
    { page: 'expense_reports', action: 'approve' },
    { page: 'expense_reports', action: 'export' },
    { page: 'reimbursements', action: 'approve' },
    { page: 'budgets', action: 'view' },
    { page: 'audit_logs', action: 'view' },
    { page: 'analytics', action: 'view' }
  ],
  cfo: [
    ...EMPLOYEE_DEFAULT_GRANTS,
    { page: 'expense_reports', action: 'approve' },
    { page: 'expense_reports', action: 'export' },
    { page: 'reimbursements', action: 'approve' },
    { page: 'budgets', action: 'view' },
    { page: 'budgets', action: 'approve' },
    { page: 'analytics', action: 'view' },
    { page: 'analytics', action: 'export' },
    { page: 'audit_logs', action: 'view' }
  ],
  employee: EMPLOYEE_DEFAULT_GRANTS
};
