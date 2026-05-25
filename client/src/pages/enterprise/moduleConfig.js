export const moduleConfigs = {
  departments: {
    pageKey: 'departments',
    title: 'Departments',
    description: 'Budget mapping, department ownership, and spend accountability.',
    endpoint: 'departments',
    columns: ['name', 'code', 'managerId', 'status'],
    fields: [
      { name: 'name', label: 'Department Name', required: true },
      { name: 'code', label: 'Department Code', required: true },
      { name: 'budget.amount', label: 'Department Budget', type: 'number' },
      { name: 'budget.currency', label: 'Currency', defaultValue: 'INR' },
      { name: 'status', label: 'Status', type: 'select', options: ['active', 'inactive'], defaultValue: 'active' }
    ]
  },
  roles: {
    pageKey: 'roles_permissions',
    title: 'Roles & Permissions',
    description: 'Dynamic RBAC roles with permission matrix controls.',
    endpoint: 'roles',
    columns: ['name', 'code', 'permissions', 'status'],
    fields: [
      { name: 'name', label: 'Role Name', required: true },
      { name: 'code', label: 'Role Code', required: true },
      { name: 'description', label: 'Description' },
      { name: 'permissions', label: 'Permissions', type: 'tags', defaultValue: 'create_expense,edit_expense,approve_expense' },
      { name: 'status', label: 'Status', type: 'select', options: ['active', 'inactive'], defaultValue: 'active' }
    ]
  },
  expense_categories: {
    pageKey: 'expense_categories',
    title: 'Expense Categories',
    description: 'Category limits, GL mapping, receipt rules, and active controls.',
    endpoint: 'expense_categories',
    columns: ['name', 'code', 'glCode', 'active'],
    fields: [
      { name: 'name', label: 'Category Name', required: true },
      { name: 'code', label: 'Category Code', required: true },
      { name: 'defaultLimit.amount', label: 'Default Limit', type: 'number' },
      { name: 'receiptMandatoryAbove', label: 'Receipt Mandatory Above', type: 'number' },
      { name: 'glCode', label: 'GL Code' },
      { name: 'active', label: 'Active', type: 'checkbox', defaultValue: true }
    ]
  },
  expense_reports: {
    pageKey: 'expense_reports',
    title: 'Expense Reports',
    description: 'Group expenses into reports and track approval to reimbursement.',
    endpoint: 'expense_reports',
    columns: ['title', 'totalAmount', 'currency', 'status'],
    fields: [
      { name: 'title', label: 'Report Title', required: true },
      { name: 'employeeId', label: 'Employee Mongo ID', required: true },
      { name: 'totalAmount', label: 'Total Amount', type: 'number' },
      { name: 'currency', label: 'Currency', defaultValue: 'INR' },
      { name: 'status', label: 'Status', type: 'select', options: ['draft', 'submitted', 'manager_approved', 'finance_verified', 'reimbursed', 'closed', 'rejected', 'sent_back'], defaultValue: 'draft' }
    ]
  },
  reimbursements: {
    pageKey: 'reimbursements',
    title: 'Reimbursements',
    description: 'Finance payment processing by bank transfer, payroll, or wallet.',
    endpoint: 'reimbursements',
    columns: ['amount', 'currency', 'method', 'status'],
    fields: [
      { name: 'employeeId', label: 'Employee Mongo ID', required: true },
      { name: 'amount', label: 'Amount', type: 'number', required: true },
      { name: 'currency', label: 'Currency', defaultValue: 'INR' },
      { name: 'method', label: 'Payment Method', type: 'select', options: ['bank_transfer', 'payroll', 'wallet'], defaultValue: 'bank_transfer' },
      { name: 'status', label: 'Status', type: 'select', options: ['pending', 'processing', 'paid', 'failed'], defaultValue: 'pending' },
      { name: 'reference', label: 'Payment Reference' }
    ]
  },
  projects: {
    title: 'Projects',
    description: 'Project budgets, project spend tracking, and ownership.',
    endpoint: 'projects',
    columns: ['name', 'code', 'status'],
    fields: [
      { name: 'name', label: 'Project Name', required: true },
      { name: 'code', label: 'Project Code', required: true },
      { name: 'budget.amount', label: 'Project Budget', type: 'number' },
      { name: 'budget.currency', label: 'Currency', defaultValue: 'INR' },
      { name: 'status', label: 'Status', type: 'select', options: ['active', 'on_hold', 'closed'], defaultValue: 'active' }
    ]
  },
  ocr_logs: {
    pageKey: 'ocr_receipts',
    title: 'OCR Receipt Management',
    description: 'Receipt OCR extraction, duplicate detection, and fraud scoring.',
    endpoint: 'ocr_logs',
    columns: ['provider', 'status', 'duplicateScore', 'fraudScore'],
    fields: [
      { name: 'provider', label: 'Provider', defaultValue: 'local-parser' },
      { name: 'status', label: 'Status', type: 'select', options: ['queued', 'processing', 'completed', 'failed'], defaultValue: 'queued' },
      { name: 'duplicateScore', label: 'Duplicate Score', type: 'number' },
      { name: 'fraudScore', label: 'Fraud Score', type: 'number' },
      { name: 'error', label: 'Error' }
    ]
  },
  approvals: {
    pageKey: 'approval_workflow',
    title: 'Approvals',
    description: 'Every dynamic approval step across expenses, reports, trips, and reimbursement.',
    endpoint: 'approvals',
    columns: ['module', 'approverRole', 'step', 'status'],
    fields: [
      { name: 'module', label: 'Module', type: 'select', options: ['expense', 'report', 'trip', 'reimbursement'], defaultValue: 'expense' },
      { name: 'recordId', label: 'Record Mongo ID', required: true },
      { name: 'approverRole', label: 'Approver Role' },
      { name: 'step', label: 'Step', type: 'number', defaultValue: 1 },
      { name: 'status', label: 'Status', type: 'select', options: ['pending', 'approved', 'rejected', 'sent_back', 'skipped'], defaultValue: 'pending' },
      { name: 'note', label: 'Note' }
    ]
  },
  audit_logs: {
    pageKey: 'audit_logs',
    title: 'Audit Logs',
    description: 'Immutable action history with actor, IP address, and before/after values.',
    endpoint: 'audit',
    readonly: true,
    columns: ['action', 'entity', 'ip', 'createdAt']
  },
  notifications: {
    pageKey: 'notifications',
    title: 'Notifications',
    description: 'Email, push, reminder, and escalation notification queue.',
    endpoint: 'notifications',
    readonly: true,
    columns: ['title', 'message', 'type', 'read', 'createdAt']
  },
  activity_logs: {
    title: 'Activity Logs',
    description: 'User timeline and operational activity across expense workflows.',
    endpoint: 'activity_logs',
    columns: ['action', 'module', 'summary', 'createdAt'],
    fields: [
      { name: 'action', label: 'Action', required: true },
      { name: 'module', label: 'Module' },
      { name: 'summary', label: 'Summary' }
    ]
  }
};
