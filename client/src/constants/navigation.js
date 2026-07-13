import { BarChart3, Bell, BriefcaseBusiness, Building2, ClipboardCheck, CreditCard, FileSearch, FileText, Gauge, Landmark, Layers3, Plane, ReceiptText, Settings, ShieldCheck, Users, WalletCards, PlusCircle, HelpCircle } from 'lucide-react';

export const navigation = [
  { key: 'dashboard', label: 'Dashboard', path: '/', icon: Gauge },
  { key: 'employees', label: 'Employees', path: '/settings/employees', icon: Users },
  { key: 'departments', label: 'Departments', path: '/departments', icon: Building2 },
  { key: 'roles_permissions', label: 'Roles & Permissions', path: '/roles-permissions', icon: ShieldCheck },
  { key: 'expense_categories', label: 'Expense Categories', path: '/expense-categories', icon: Layers3 },
  { key: 'policies', label: 'Policies', path: '/policies', icon: ShieldCheck },
  { key: 'approval_workflow', label: 'Approval Workflow', path: '/settings/workflows', icon: BriefcaseBusiness },
  { key: 'expense_reports', label: 'Expense Reports', path: '/expense-reports', icon: FileText },
  { key: 'trips', label: 'Trips', path: '/travel', icon: Plane },
  { key: 'advances', label: 'Advances', path: '/advances', icon: WalletCards },
  { key: 'reimbursements', label: 'Reimbursements', path: '/reimbursements', icon: Landmark },
  { key: 'budgets', label: 'Budgets', path: '/budgets', icon: WalletCards },
  { key: 'ocr_receipts', label: 'OCR Receipt Management', path: '/ocr-receipts', icon: ReceiptText },
  { key: 'notifications', label: 'Notifications', path: '/notifications', icon: Bell },
  { key: 'support', label: 'Help & Support', path: '/support', icon: HelpCircle },
  { key: 'audit_logs', label: 'Audit Logs', path: '/audit-logs', icon: FileSearch },
  { key: 'violation_center', label: 'Violation Center', path: '/violation-center', icon: ShieldCheck },
  { key: 'analytics', label: 'Analytics', path: '/analytics', icon: BarChart3 },
  { key: 'settings', label: 'Settings', path: '/settings', icon: Settings }
];

export const superAdminNavigation = [
  { key: 'dashboard', label: 'Dashboard', path: '/', icon: Gauge },
  { key: 'company', label: 'Company', path: '/settings/company', icon: Building2 }
];

export const employeeNavigation = [
  { key: 'dashboard', label: 'Dashboard', path: '/', icon: Gauge },
  { key: 'expenses', label: 'My Expenses', path: '/expenses', icon: CreditCard },
  { key: 'expense_reports', label: 'Expense Reports', path: '/expense-reports', icon: FileText },
  { key: 'trips', label: 'Trips', path: '/travel', icon: Plane },
  { key: 'reimbursements', label: 'Reimbursements', path: '/reimbursements', icon: Landmark },
  { key: 'approvals', label: 'My Approvals', path: '/approvals', icon: ClipboardCheck },
  { key: 'notifications', label: 'Notifications', path: '/notifications', icon: Bell },
  { key: 'settings', label: 'Profile & Settings', path: '/settings', icon: Settings },
  { key: 'support', label: 'Help & Support', path: '/support', icon: HelpCircle }
];

export const managerNavigation = [
  { key: 'dashboard', label: 'Dashboard', path: '/manager', icon: Gauge },
  { key: 'team_expenses', label: 'Team Expenses', path: '/manager/team-expenses', icon: CreditCard },
  { key: 'approvals', label: 'Pending Approvals', path: '/manager/pending-approvals', icon: ClipboardCheck },
  { key: 'expense_reports', label: 'Expense Reports', path: '/manager/expense-reports', icon: FileText },
  { key: 'trips', label: 'Trips', path: '/manager/trips', icon: Plane },
  { key: 'budgets', label: 'Budgets', path: '/manager/budgets', icon: WalletCards },
  { key: 'violation_center', label: 'Policy Violations', path: '/manager/policy-violations', icon: FileSearch },
  { key: 'analytics', label: 'Team Analytics', path: '/manager/analytics', icon: BarChart3 },
  { key: 'notifications', label: 'Notifications', path: '/manager/notifications', icon: Bell },
  { key: 'support', label: 'Help & Support', path: '/support', icon: HelpCircle },
  { key: 'settings', label: 'Profile & Settings', path: '/manager/settings', icon: Settings }
];

export const financeNavigation = [
  { key: 'dashboard', label: 'Dashboard', path: '/finance', icon: Gauge },
  { key: 'verification', label: 'Expense Verification', path: '/finance/verification', icon: ClipboardCheck },
  { key: 'reimbursements', label: 'Reimbursements', path: '/finance/reimbursements', icon: Landmark },
  { key: 'expense_reports', label: 'Expense Reports', path: '/finance/expense-reports', icon: FileText },
  { key: 'budgets', label: 'Budgets', path: '/finance/budgets', icon: WalletCards },
  { key: 'accounting', label: 'Accounting & Exports', path: '/finance/accounting', icon: FileText },
  { key: 'audit_logs', label: 'Audit & Compliance', path: '/finance/audit-compliance', icon: FileSearch },
  { key: 'violation_center', label: 'Policy Violations', path: '/finance/policy-violations', icon: ShieldCheck },
  { key: 'analytics', label: 'Analytics & Reports', path: '/finance/analytics', icon: BarChart3 },
  { key: 'notifications', label: 'Notifications', path: '/finance/notifications', icon: Bell },
  { key: 'support', label: 'Help & Support', path: '/support', icon: HelpCircle },
  { key: 'settings', label: 'Profile & Settings', path: '/finance/settings', icon: Settings }
];

export const expenseCategories = ['Meals', 'Travel', 'Hotel', 'Fuel', 'Software', 'Office Supplies', 'Telecom', 'Training'];
