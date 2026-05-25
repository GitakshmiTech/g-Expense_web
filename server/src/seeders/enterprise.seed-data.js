import mongoose from 'mongoose';

export const buildEnterpriseSeedData = () => {
  const companyId = new mongoose.Types.ObjectId();
  const financeDepartmentId = new mongoose.Types.ObjectId();
  const engineeringDepartmentId = new mongoose.Types.ObjectId();
  const managerRoleId = new mongoose.Types.ObjectId();
  const financeRoleId = new mongoose.Types.ObjectId();
  const employeeRoleId = new mongoose.Types.ObjectId();
  const managerId = new mongoose.Types.ObjectId();
  const financeUserId = new mongoose.Types.ObjectId();
  const employeeId = new mongoose.Types.ObjectId();
  const policyId = new mongoose.Types.ObjectId();
  const budgetId = new mongoose.Types.ObjectId();
  const expenseId = new mongoose.Types.ObjectId();
  const reportId = new mongoose.Types.ObjectId();
  const receiptId = new mongoose.Types.ObjectId();

  return {
    companies: [
      {
        _id: companyId,
        name: 'Gitakshmi Technologies',
        legalName: 'Gitakshmi Technologies Pvt Ltd',
        domain: 'gitakshmi.com',
        baseCurrency: 'INR',
        country: 'IN',
        status: 'active',
        settings: { receiptRequiredAbove: 500, duplicateWindowDays: 7, baseTaxType: 'GST' }
      }
    ],
    departments: [
      { _id: engineeringDepartmentId, companyId, name: 'Engineering', code: 'ENG', managerId, budget: { amount: 2500000, currency: 'INR', baseAmount: 2500000, baseCurrency: 'INR' }, costCenter: 'CC-ENG', status: 'active' },
      { _id: financeDepartmentId, companyId, name: 'Finance', code: 'FIN', managerId: financeUserId, budget: { amount: 1000000, currency: 'INR', baseAmount: 1000000, baseCurrency: 'INR' }, costCenter: 'CC-FIN', status: 'active' }
    ],
    roles: [
      { _id: managerRoleId, companyId, name: 'Manager', code: 'manager', permissions: [{ module: 'expenses', action: 'approve', scope: 'team' }, { module: 'reports', action: 'view', scope: 'team' }], systemRole: true, status: 'active' },
      { _id: financeRoleId, companyId, name: 'Finance Controller', code: 'finance', permissions: [{ module: 'reimbursements', action: 'process', scope: 'company' }, { module: 'tax', action: 'validate', scope: 'company' }], systemRole: true, status: 'active' },
      { _id: employeeRoleId, companyId, name: 'Employee', code: 'employee', permissions: [{ module: 'expenses', action: 'create', scope: 'own' }], systemRole: true, status: 'active' }
    ],
    users: [
      { _id: managerId, companyId, fullName: 'Meera Manager', email: 'meera.manager@gitakshmi.com', employeeCode: 'GT-1001', passwordHash: 'ChangeMe@123', departmentId: engineeringDepartmentId, roleIds: [managerRoleId], status: 'active' },
      { _id: financeUserId, companyId, fullName: 'Farhan Finance', email: 'farhan.finance@gitakshmi.com', employeeCode: 'GT-1002', passwordHash: 'ChangeMe@123', departmentId: financeDepartmentId, roleIds: [financeRoleId], status: 'active' },
      { _id: employeeId, companyId, fullName: 'Neel Employee', email: 'neel.employee@gitakshmi.com', employeeCode: 'GT-1003', passwordHash: 'ChangeMe@123', departmentId: engineeringDepartmentId, roleIds: [employeeRoleId], managerId, status: 'active' }
    ],
    policies: [
      {
        _id: policyId,
        companyId,
        name: 'India Employee Expense Policy',
        code: 'IN-EMP-EXP',
        appliesTo: { departments: [engineeringDepartmentId], countries: ['IN'] },
        effectiveFrom: new Date('2026-04-01'),
        rules: [
          { category: 'Meals', dailyLimit: { amount: 1500, currency: 'INR', baseAmount: 1500, baseCurrency: 'INR' }, receiptRequiredAbove: 500, severity: 'warning' },
          { category: 'Travel', perExpenseLimit: { amount: 25000, currency: 'INR', baseAmount: 25000, baseCurrency: 'INR' }, receiptRequiredAbove: 1000, severity: 'block' }
        ],
        status: 'active'
      }
    ],
    budgets: [
      {
        _id: budgetId,
        companyId,
        name: 'Engineering Q2 FY26 Budget',
        type: 'department',
        departmentId: engineeringDepartmentId,
        period: { start: new Date('2026-04-01'), end: new Date('2026-06-30') },
        allocated: { amount: 2500000, currency: 'INR', baseAmount: 2500000, baseCurrency: 'INR' },
        consumed: 418000,
        committed: 75000,
        thresholds: [{ percentage: 80, channels: ['email', 'in_app'], recipients: [managerId, financeUserId] }],
        status: 'active'
      }
    ],
    receipts: [
      {
        _id: receiptId,
        companyId,
        expenseId,
        fileName: 'taj-cafe-receipt.pdf',
        fileUrl: 'https://res.cloudinary.com/company/receipts/taj-cafe-receipt.pdf',
        fileHash: 'sha256:7d7f44f7f0a2c7c8b2473c1e',
        mimeType: 'application/pdf',
        ocr: { merchant: 'Taj Cafe', date: new Date('2026-05-20'), amount: 1250, currency: 'INR', confidence: 0.94 },
        duplicateScore: 0,
        status: 'ocr_done'
      }
    ],
    expenses: [
      {
        _id: expenseId,
        companyId,
        employeeId,
        departmentId: engineeringDepartmentId,
        budgetId,
        category: 'Meals',
        merchant: 'Taj Cafe',
        expenseDate: new Date('2026-05-20'),
        amount: { amount: 1250, currency: 'INR', baseAmount: 1250, baseCurrency: 'INR', fxRate: 1 },
        tax: { type: 'GST', taxableAmount: 1059, taxAmount: 191, validationStatus: 'missing_tax_id' },
        paymentMode: 'personal_card',
        receiptIds: [receiptId],
        status: 'submitted',
        lifecycle: [{ status: 'submitted', changedBy: employeeId, changedAt: new Date('2026-05-20T10:00:00Z') }],
        policySnapshot: { policyId, code: 'IN-EMP-EXP' },
        riskScore: 12
      }
    ],
    reports: [
      {
        _id: reportId,
        companyId,
        reportNo: 'RPT-FY26-0001',
        title: 'Client Visit May Expenses',
        employeeId,
        departmentId: engineeringDepartmentId,
        expenseIds: [expenseId],
        total: { amount: 1250, currency: 'INR', baseAmount: 1250, baseCurrency: 'INR' },
        status: 'submitted',
        submittedAt: new Date('2026-05-20T10:05:00Z'),
        currentApproverRole: 'manager'
      }
    ],
    approvalHistory: [
      { companyId, module: 'report', recordId: reportId, step: 1, approverRole: 'manager', approverId: managerId, action: 'pending', slaDueAt: new Date('2026-05-22T10:05:00Z') }
    ],
    violations: [
      { companyId, expenseId, reportId, employeeId, policyId, type: 'missing_receipt', severity: 'low', message: 'Receipt is attached and OCR passed. No active receipt issue.', status: 'resolved', score: 5, resolvedBy: managerId, resolvedAt: new Date('2026-05-20T10:10:00Z') }
    ],
    reimbursements: [
      { companyId, reimbursementNo: 'RMB-FY26-0001', reportId, employeeId, amount: { amount: 1250, currency: 'INR', baseAmount: 1250, baseCurrency: 'INR' }, method: 'bank_transfer', status: 'pending' }
    ],
    notifications: [
      { companyId, userId: managerId, channel: 'in_app', title: 'Report pending approval', message: 'Client Visit May Expenses is waiting for review.', priority: 'normal', status: 'delivered', deliveredAt: new Date() }
    ]
  };
};
