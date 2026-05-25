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
  { key: 'audit_logs', label: 'Audit Logs', path: '/audit-logs', icon: FileSearch },
  { key: 'violation_center', label: 'Violation Center', path: '/violation-center', icon: ShieldCheck },
  { key: 'analytics', label: 'Analytics', path: '/analytics', icon: BarChart3 },
  { key: 'settings', label: 'Settings', path: '/settings', icon: Settings }
];

export const superAdminNavigation = [
  { label: 'Dashboard', path: '/', icon: Gauge },
  { label: 'Company', path: '/settings/company', icon: Building2 }
];

export const employeeNavigation = [
  { label: 'Dashboard', path: '/', icon: Gauge },
  { label: 'My Expenses', path: '/expenses', icon: CreditCard },
  { label: 'Expense Reports', path: '/expense-reports', icon: FileText },
  { label: 'Trips', path: '/travel', icon: Plane },
  { label: 'Reimbursements', path: '/reimbursements', icon: Landmark },
  { label: 'My Approvals', path: '/approvals', icon: ClipboardCheck },
  { label: 'Notifications', path: '/notifications', icon: Bell },
  { label: 'Profile & Settings', path: '/settings', icon: Settings },
  { label: 'Help & Support', path: '/support', icon: HelpCircle }
];

export const managerNavigation = [
  { label: 'Dashboard', path: '/manager', icon: Gauge },
  { label: 'Team Expenses', path: '/manager/team-expenses', icon: CreditCard },
  { label: 'Pending Approvals', path: '/manager/pending-approvals', icon: ClipboardCheck },
  { label: 'Expense Reports', path: '/manager/expense-reports', icon: FileText },
  { label: 'Trips', path: '/manager/trips', icon: Plane },
  { label: 'Budgets', path: '/manager/budgets', icon: WalletCards },
  { label: 'Policy Violations', path: '/manager/policy-violations', icon: FileSearch },
  { label: 'Team Analytics', path: '/manager/analytics', icon: BarChart3 },
  { label: 'Notifications', path: '/manager/notifications', icon: Bell },
  { label: 'Profile & Settings', path: '/manager/settings', icon: Settings }
];

export const financeNavigation = [
  { label: 'Dashboard', path: '/finance', icon: Gauge },
  { label: 'Expense Verification', path: '/finance/verification', icon: ClipboardCheck },
  { label: 'Reimbursements', path: '/finance/reimbursements', icon: Landmark },
  { label: 'Expense Reports', path: '/finance/expense-reports', icon: FileText },
  { label: 'Budgets', path: '/finance/budgets', icon: WalletCards },
  { label: 'Accounting & Exports', path: '/finance/accounting', icon: FileText },
  { label: 'Audit & Compliance', path: '/finance/audit-compliance', icon: FileSearch },
  { label: 'Policy Violations', path: '/finance/policy-violations', icon: ShieldCheck },
  { label: 'Analytics & Reports', path: '/finance/analytics', icon: BarChart3 },
  { label: 'Notifications', path: '/finance/notifications', icon: Bell },
  { label: 'Profile & Settings', path: '/finance/settings', icon: Settings }
];

export const expenseCategories = ['Meals', 'Travel', 'Hotel', 'Fuel', 'Software', 'Office Supplies', 'Telecom', 'Training'];
