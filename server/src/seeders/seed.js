import { connectDb } from '../config/db.js';
import { env } from '../config/env.js';
import { Company } from '../models/Company.js';
import { User } from '../models/User.js';
import { Workflow } from '../models/Workflow.js';
import { Policy } from '../models/Policy.js';
import { Budget } from '../models/Budget.js';
import { Expense } from '../models/Expense.js';
import { AccountingExport, Approval, Department, EnterpriseRole, ErpIntegration, ExpenseCategory, ExpenseReport, PaymentTransaction, Permission, Reimbursement, TaxValidation } from '../models/Enterprise.js';

const run = async () => {
  await connectDb();
  await Promise.all([
    Company.deleteMany({}),
    User.deleteMany({}),
    Workflow.deleteMany({}),
    Policy.deleteMany({}),
    Budget.deleteMany({}),
    Expense.deleteMany({}),
    Department.deleteMany({}),
    EnterpriseRole.deleteMany({}),
    Permission.deleteMany({}),
    ExpenseCategory.deleteMany({}),
    ExpenseReport.deleteMany({}),
    Approval.deleteMany({}),
    Reimbursement.deleteMany({}),
    TaxValidation.deleteMany({}),
    PaymentTransaction.deleteMany({}),
    AccountingExport.deleteMany({}),
    ErpIntegration.deleteMany({})
  ]);
  const company = await Company.create({ name: 'GT Technologies', legalName: 'GT Technologies Pvt Ltd', domain: 'gt.local', status: 'active', baseCurrency: 'INR' });
  const superAdmin = await User.create({ name: 'GT Super Admin', email: env.superAdminEmail, password: env.superAdminPassword, role: 'super_admin', permissions: ['*'] });
  const admin = await User.create({ companyId: company._id, name: 'Asha Admin', email: 'admin@gt.local', password: 'admin123', role: 'company_admin', department: 'Finance' });
  const manager = await User.create({ companyId: company._id, name: 'Meera Manager', email: 'manager@gt.local', password: 'admin123', role: 'manager', department: 'Engineering' });
  const finance = await User.create({ companyId: company._id, name: 'Farhan Finance', email: 'finance@gt.local', password: 'admin123', role: 'finance', department: 'Finance' });
  const cfo = await User.create({ companyId: company._id, name: 'Chitra CFO', email: 'cfo@gt.local', password: 'admin123', role: 'cfo', department: 'Finance' });
  const employee = await User.create({ companyId: company._id, name: 'Neel Employee', email: 'employee@gt.local', password: 'admin123', role: 'employee', department: 'Engineering', managerId: manager._id });
  await Department.create([
    { companyId: company._id, name: 'Engineering', code: 'ENG', budget: { amount: 500000, currency: 'INR' }, managerId: manager._id },
    { companyId: company._id, name: 'Finance', code: 'FIN', budget: { amount: 300000, currency: 'INR' }, managerId: finance._id }
  ]);
  await Permission.create([
    { companyId: company._id, key: 'create_expense', label: 'Create Expense', module: 'expenses' },
    { companyId: company._id, key: 'approve_expense', label: 'Approve Expense', module: 'approvals' },
    { companyId: company._id, key: 'manage_budget', label: 'Manage Budget', module: 'budgets' },
    { companyId: company._id, key: 'manage_reports', label: 'Manage Reports', module: 'reports' }
  ]);
  await EnterpriseRole.create([
    { companyId: company._id, name: 'Manager', code: 'manager', permissions: ['approve_expense', 'manage_reports'] },
    { companyId: company._id, name: 'Finance Controller', code: 'finance', permissions: ['approve_expense', 'manage_budget', 'manage_reports'] }
  ]);
  await ExpenseCategory.create([
    { companyId: company._id, name: 'Meals', code: 'MEALS', defaultLimit: { amount: 1500, currency: 'INR' }, receiptMandatoryAbove: 500, glCode: '6100' },
    { companyId: company._id, name: 'Travel', code: 'TRAVEL', defaultLimit: { amount: 25000, currency: 'INR' }, receiptMandatoryAbove: 1000, glCode: '6200' }
  ]);
  await Workflow.create({
    companyId: company._id,
    name: 'Default Amount Based Workflow',
    rules: [{ when: { field: 'amount', operator: '>', value: 5000 }, approvals: [{ role: 'manager' }, { role: 'finance' }, { role: 'cfo' }], elseApprovals: [{ role: 'manager' }] }],
    nodes: [
      { id: 'condition-amount', type: 'condition', label: 'Amount > 5000', config: { field: 'amount', operator: '>', value: 5000 }, position: { x: 80, y: 60 } },
      { id: 'manager', type: 'approval', label: 'Manager Approval', config: { role: 'manager' }, position: { x: 340, y: 20 } },
      { id: 'finance', type: 'approval', label: 'Finance Approval', config: { role: 'finance' }, position: { x: 600, y: 20 } },
      { id: 'cfo', type: 'approval', label: 'CFO Approval', config: { role: 'cfo' }, position: { x: 860, y: 20 } }
    ],
    edges: [{ from: 'condition-amount', to: 'manager', label: 'true' }, { from: 'manager', to: 'finance' }, { from: 'finance', to: 'cfo' }]
  });
  await Policy.create({
    companyId: company._id,
    name: 'India Employee Expense Policy',
    appliesTo: { countries: ['IN'], roles: ['employee'], departments: [] },
    rules: [
      { category: 'Meals', maxAmount: 1500, receiptRequiredAbove: 500, severity: 'warning' },
      { category: 'Travel', maxAmount: 25000, receiptRequiredAbove: 1000, severity: 'block' }
    ]
  });
  await Budget.create({ companyId: company._id, name: 'Engineering Q2 Budget', type: 'department', department: 'Engineering', amount: 500000, consumed: 128000, period: { start: new Date('2026-04-01'), end: new Date('2026-06-30') }, thresholds: [{ percentage: 80, channel: 'email', recipients: ['finance@gt.local'] }] });
  const seededExpenses = await Expense.create([
    { companyId: company._id, employeeId: employee._id, createdBy: employee._id, category: 'Meals', merchant: 'Taj Cafe', expenseDate: new Date(), amount: 1250, currency: 'INR', convertedAmount: 1250, status: 'submitted', approvalPath: [{ approverRole: 'manager', status: 'pending' }] },
    { companyId: company._id, employeeId: employee._id, createdBy: employee._id, category: 'Travel', merchant: 'Indigo', expenseDate: new Date(), amount: 18400, currency: 'INR', convertedAmount: 18400, status: 'finance_review', approvalPath: [{ approverRole: 'manager', status: 'approved', approverId: manager._id, actedAt: new Date() }, { approverRole: 'finance', status: 'pending' }, { approverRole: 'cfo', status: 'pending' }] }
  ]);
  const report = await ExpenseReport.create({
    companyId: company._id,
    employeeId: employee._id,
    title: 'May Client Visit Expenses',
    expenses: seededExpenses.map((expense) => expense._id),
    totalAmount: 19650,
    currency: 'INR',
    status: 'submitted',
    submittedAt: new Date(),
    createdBy: employee._id,
    updatedBy: employee._id
  });
  await Approval.create({ companyId: company._id, module: 'report', recordId: report._id, approverRole: 'manager', step: 1, status: 'pending' });
  const reimbursement = await Reimbursement.create({ companyId: company._id, employeeId: employee._id, reportId: report._id, amount: 1250, currency: 'INR', method: 'bank_transfer', status: 'failed', failureReason: 'Bank account validation failed', retryCount: 1, reference: 'PAY-DEMO-001' });
  await TaxValidation.create({ companyId: company._id, expenseId: seededExpenses[0]._id, reportId: report._id, taxType: 'GST', taxableAmount: 1059, taxAmount: 191, expectedTaxAmount: 191, status: 'missing_tax_id', findings: [{ code: 'GST_ID_MISSING', message: 'GST registration number is missing', severity: 'warning' }] });
  await PaymentTransaction.create({ companyId: company._id, reimbursementId: reimbursement._id, amount: reimbursement.amount, currency: 'INR', reference: reimbursement.reference, status: 'failed', failureReason: reimbursement.failureReason, retryCount: 1 });
  await AccountingExport.create({ companyId: company._id, exportNo: 'EXP-DEMO-001', format: 'csv', status: 'generated', recordCount: 1, totalAmount: 1250, erpTarget: 'custom' });
  await ErpIntegration.create({ companyId: company._id, name: 'Custom Finance ERP', provider: 'custom', authType: 'none', active: true, lastSyncStatus: 'ready' });
  console.log(JSON.stringify({ seeded: true, company: company.name, users: [superAdmin.email, admin.email, manager.email, finance.email, cfo.email, employee.email] }, null, 2));
  process.exit(0);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
