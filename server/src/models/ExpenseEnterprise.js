import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { auditFields, enterpriseBasePlugin, lifecycleSchema, moneySchema, objectId, softDeleteFields, tenantField } from './plugins/enterpriseBase.plugin.js';

const registerModel = (name, schema, collection) => mongoose.models[name] || mongoose.model(name, schema, collection);

const permissionSchema = new mongoose.Schema(
  {
    module: { type: String, required: true, trim: true },
    action: { type: String, required: true, trim: true },
    scope: { type: String, enum: ['own', 'team', 'department', 'company', 'global'], default: 'own' }
  },
  { _id: false }
);

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    legalName: { type: String, trim: true },
    domain: { type: String, lowercase: true, trim: true },
    baseCurrency: { type: String, uppercase: true, default: 'INR' },
    country: { type: String, uppercase: true, default: 'IN' },
    status: { type: String, enum: ['trial', 'active', 'suspended', 'cancelled'], default: 'trial', index: true },
    fiscalYearStartMonth: { type: Number, min: 1, max: 12, default: 4 },
    settings: {
      receiptRequiredAbove: { type: Number, default: 500 },
      duplicateWindowDays: { type: Number, default: 7 },
      baseTaxType: { type: String, enum: ['GST', 'VAT', 'NONE'], default: 'GST' }
    }
  },
  { timestamps: true }
);
companySchema.add(auditFields);
companySchema.add(softDeleteFields);
companySchema.index({ domain: 1 }, { unique: true, sparse: true });
companySchema.index({ status: 1, isDeleted: 1 });

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, uppercase: true, trim: true },
  parentDepartmentId: objectId('Department'),
  managerId: objectId('User'),
  budget: moneySchema,
  costCenter: { type: String, trim: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true }
});
departmentSchema.plugin(enterpriseBasePlugin);
departmentSchema.index({ companyId: 1, code: 1, isDeleted: 1 }, { unique: true });
departmentSchema.index({ companyId: 1, managerId: 1, status: 1 });

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, lowercase: true, trim: true },
  description: String,
  permissions: [permissionSchema],
  systemRole: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true }
});
roleSchema.plugin(enterpriseBasePlugin);
roleSchema.index({ companyId: 1, code: 1, isDeleted: 1 }, { unique: true });

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  employeeCode: { type: String, required: true, trim: true },
  departmentId: objectId('Department'),
  roleIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role', index: true }],
  managerId: objectId('User'),
  designation: String,
  phone: String,
  locale: { type: String, default: 'en-IN' },
  timezone: { type: String, default: 'Asia/Kolkata' },
  status: { type: String, enum: ['invited', 'active', 'suspended', 'offboarded'], default: 'active', index: true },
  lastLoginAt: Date,
  mfa: { enabled: { type: Boolean, default: false }, secretHash: { type: String, select: false } }
});
userSchema.plugin(enterpriseBasePlugin);
userSchema.index({ companyId: 1, email: 1, isDeleted: 1 }, { unique: true });
userSchema.index({ companyId: 1, employeeCode: 1, isDeleted: 1 }, { unique: true });
userSchema.index({ companyId: 1, managerId: 1, status: 1 });
userSchema.pre('validate', async function hashPassword(next) {
  if (this.isModified('passwordHash') && !String(this.passwordHash).startsWith('$2')) this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

const policySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, uppercase: true, trim: true },
  appliesTo: {
    departments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],
    roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    countries: [{ type: String, uppercase: true }]
  },
  effectiveFrom: { type: Date, required: true },
  effectiveTo: Date,
  rules: [{
    category: { type: String, required: true },
    dailyLimit: moneySchema,
    monthlyLimit: moneySchema,
    perExpenseLimit: moneySchema,
    receiptRequiredAbove: { type: Number, default: 0 },
    severity: { type: String, enum: ['warning', 'block', 'escalate'], default: 'warning' }
  }],
  status: { type: String, enum: ['draft', 'active', 'archived'], default: 'draft', index: true }
});
policySchema.plugin(enterpriseBasePlugin);
policySchema.index({ companyId: 1, code: 1, isDeleted: 1 }, { unique: true });
policySchema.index({ companyId: 1, status: 1, effectiveFrom: -1 });

const expenseSchema = new mongoose.Schema({
  employeeId: objectId('User', true),
  departmentId: objectId('Department'),
  reportId: objectId('ExpenseReport'),
  tripId: objectId('Trip'),
  budgetId: objectId('Budget'),
  category: { type: String, required: true, index: true },
  merchant: { type: String, trim: true },
  expenseDate: { type: Date, required: true, index: true },
  amount: moneySchema,
  tax: {
    type: { type: String, enum: ['GST', 'VAT', 'NONE'], default: 'GST' },
    taxId: String,
    taxableAmount: Number,
    taxAmount: Number,
    validationStatus: { type: String, enum: ['pending', 'valid', 'mismatch', 'missing_tax_id', 'not_applicable'], default: 'pending', index: true }
  },
  paymentMode: { type: String, enum: ['cash', 'personal_card', 'corporate_card', 'bank', 'upi', 'wallet'], default: 'personal_card' },
  receiptIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Receipt' }],
  notes: String,
  status: { type: String, enum: ['draft', 'submitted', 'manager_review', 'finance_review', 'cfo_review', 'approved', 'rejected', 'sent_back', 'reimbursed', 'closed'], default: 'draft', index: true },
  lifecycle: [lifecycleSchema],
  policySnapshot: mongoose.Schema.Types.Mixed,
  riskScore: { type: Number, min: 0, max: 100, default: 0, index: true }
});
expenseSchema.plugin(enterpriseBasePlugin);
expenseSchema.index({ companyId: 1, employeeId: 1, expenseDate: -1 });
expenseSchema.index({ companyId: 1, departmentId: 1, status: 1, expenseDate: -1 });
expenseSchema.index({ companyId: 1, category: 1, expenseDate: -1 });
expenseSchema.index({ companyId: 1, merchant: 1, 'amount.amount': 1, expenseDate: 1 });
expenseSchema.index({ companyId: 1, status: 1, riskScore: -1 });

const receiptSchema = new mongoose.Schema({
  expenseId: objectId('Expense'),
  fileName: String,
  storageProvider: { type: String, enum: ['local', 'cloudinary', 's3'], default: 'cloudinary' },
  fileUrl: { type: String, required: true },
  publicId: String,
  mimeType: String,
  fileHash: { type: String, required: true, index: true },
  ocr: {
    merchant: String,
    date: Date,
    amount: Number,
    currency: String,
    taxId: String,
    rawText: String,
    confidence: Number
  },
  duplicateScore: { type: Number, default: 0, index: true },
  status: { type: String, enum: ['uploaded', 'ocr_pending', 'ocr_done', 'failed'], default: 'uploaded', index: true }
});
receiptSchema.plugin(enterpriseBasePlugin);
receiptSchema.index({ companyId: 1, fileHash: 1, isDeleted: 1 });
receiptSchema.index({ companyId: 1, expenseId: 1 });

const reportSchema = new mongoose.Schema({
  reportNo: { type: String, required: true },
  title: { type: String, required: true },
  employeeId: objectId('User', true),
  departmentId: objectId('Department'),
  expenseIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Expense' }],
  total: moneySchema,
  status: { type: String, enum: ['draft', 'submitted', 'manager_approved', 'finance_verified', 'reimbursement_pending', 'reimbursed', 'closed', 'rejected', 'sent_back'], default: 'draft', index: true },
  submittedAt: Date,
  lifecycle: [lifecycleSchema],
  currentApproverRole: { type: String, index: true }
});
reportSchema.plugin(enterpriseBasePlugin);
reportSchema.index({ companyId: 1, reportNo: 1, isDeleted: 1 }, { unique: true });
reportSchema.index({ companyId: 1, employeeId: 1, status: 1, createdAt: -1 });
reportSchema.index({ companyId: 1, currentApproverRole: 1, status: 1 });

const approvalHistorySchema = new mongoose.Schema({
  module: { type: String, enum: ['expense', 'report', 'trip', 'reimbursement'], required: true, index: true },
  recordId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  step: { type: Number, required: true },
  approverRole: { type: String, required: true, index: true },
  approverId: objectId('User'),
  action: { type: String, enum: ['pending', 'approved', 'rejected', 'sent_back', 'escalated', 'skipped'], default: 'pending', index: true },
  note: String,
  actedAt: Date,
  slaDueAt: Date,
  delegatedTo: objectId('User')
});
approvalHistorySchema.plugin(enterpriseBasePlugin);
approvalHistorySchema.index({ companyId: 1, module: 1, recordId: 1, step: 1 });
approvalHistorySchema.index({ companyId: 1, approverId: 1, action: 1, slaDueAt: 1 });

const violationSchema = new mongoose.Schema({
  expenseId: objectId('Expense', true),
  reportId: objectId('ExpenseReport'),
  employeeId: objectId('User', true),
  policyId: objectId('Policy'),
  type: { type: String, enum: ['over_limit', 'missing_receipt', 'duplicate_expense', 'duplicate_receipt', 'tax_mismatch', 'suspicious_pattern'], required: true, index: true },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium', index: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['open', 'acknowledged', 'waived', 'resolved'], default: 'open', index: true },
  score: { type: Number, min: 0, max: 100, default: 0, index: true },
  resolvedBy: objectId('User'),
  resolvedAt: Date
});
violationSchema.plugin(enterpriseBasePlugin);
violationSchema.index({ companyId: 1, employeeId: 1, status: 1, severity: 1 });
violationSchema.index({ companyId: 1, type: 1, createdAt: -1 });

const tripSchema = new mongoose.Schema({
  tripNo: { type: String, required: true },
  employeeId: objectId('User', true),
  departmentId: objectId('Department'),
  destination: { type: String, required: true },
  purpose: String,
  dateRange: { start: Date, end: Date },
  estimatedBudget: moneySchema,
  actualSpend: moneySchema,
  status: { type: String, enum: ['draft', 'submitted', 'approved', 'booking', 'in_progress', 'completed', 'rejected', 'cancelled'], default: 'draft', index: true },
  lifecycle: [lifecycleSchema]
});
tripSchema.plugin(enterpriseBasePlugin);
tripSchema.index({ companyId: 1, tripNo: 1, isDeleted: 1 }, { unique: true });
tripSchema.index({ companyId: 1, employeeId: 1, status: 1, 'dateRange.start': -1 });

const budgetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['department', 'employee', 'project', 'category'], required: true, index: true },
  departmentId: objectId('Department'),
  employeeId: objectId('User'),
  category: String,
  period: { start: { type: Date, required: true }, end: { type: Date, required: true } },
  allocated: moneySchema,
  consumed: { type: Number, default: 0, min: 0 },
  committed: { type: Number, default: 0, min: 0 },
  thresholds: [{ percentage: Number, channels: [String], recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] }],
  status: { type: String, enum: ['active', 'closed', 'paused'], default: 'active', index: true }
});
budgetSchema.plugin(enterpriseBasePlugin);
budgetSchema.index({ companyId: 1, type: 1, departmentId: 1, employeeId: 1, category: 1, 'period.start': 1, 'period.end': 1 });
budgetSchema.index({ companyId: 1, status: 1, 'period.end': 1 });

const reimbursementSchema = new mongoose.Schema({
  reimbursementNo: { type: String, required: true },
  reportId: objectId('ExpenseReport', true),
  employeeId: objectId('User', true),
  amount: moneySchema,
  method: { type: String, enum: ['bank_transfer', 'payroll', 'wallet'], default: 'bank_transfer' },
  status: { type: String, enum: ['pending', 'processing', 'paid', 'failed', 'cancelled'], default: 'pending', index: true },
  reference: String,
  retryCount: { type: Number, default: 0 },
  failureReason: String,
  paidAt: Date
});
reimbursementSchema.plugin(enterpriseBasePlugin);
reimbursementSchema.index({ companyId: 1, reimbursementNo: 1, isDeleted: 1 }, { unique: true });
reimbursementSchema.index({ companyId: 1, employeeId: 1, status: 1, createdAt: -1 });
reimbursementSchema.index({ companyId: 1, reportId: 1 });

const notificationSchema = new mongoose.Schema({
  userId: objectId('User', true),
  channel: { type: String, enum: ['in_app', 'email', 'sms', 'push', 'socket'], default: 'in_app', index: true },
  title: { type: String, required: true },
  message: String,
  data: mongoose.Schema.Types.Mixed,
  priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal', index: true },
  status: { type: String, enum: ['queued', 'delivered', 'read', 'failed'], default: 'queued', index: true },
  deliveredAt: Date,
  readAt: Date
});
notificationSchema.plugin(enterpriseBasePlugin);
notificationSchema.index({ companyId: 1, userId: 1, status: 1, createdAt: -1 });
notificationSchema.index({ companyId: 1, channel: 1, status: 1 });

const auditLogSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
    actorId: objectId('User'),
    action: { type: String, required: true, index: true },
    entity: { type: String, required: true, index: true },
    entityId: { type: String, index: true },
    requestId: String,
    ip: String,
    userAgent: String,
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
    metadata: mongoose.Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now, index: true }
  },
  { versionKey: false }
);
auditLogSchema.index({ companyId: 1, entity: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ companyId: 1, actorId: 1, createdAt: -1 });

export const EnterpriseCompany = registerModel('EnterpriseCompany', companySchema, 'companies');
export const EnterpriseDepartment = registerModel('EnterpriseDepartment', departmentSchema, 'departments');
export const EnterpriseRoleModel = registerModel('EnterpriseRoleModel', roleSchema, 'roles');
export const EnterpriseUser = registerModel('EnterpriseUser', userSchema, 'users');
export const EnterprisePolicy = registerModel('EnterprisePolicy', policySchema, 'policies');
export const EnterpriseExpense = registerModel('EnterpriseExpense', expenseSchema, 'expenses');
export const EnterpriseReceipt = registerModel('EnterpriseReceipt', receiptSchema, 'receipts');
export const EnterpriseReport = registerModel('EnterpriseReport', reportSchema, 'expense_reports');
export const EnterpriseApprovalHistory = registerModel('EnterpriseApprovalHistory', approvalHistorySchema, 'approval_history');
export const EnterpriseViolation = registerModel('EnterpriseViolation', violationSchema, 'violations');
export const EnterpriseTrip = registerModel('EnterpriseTrip', tripSchema, 'trips');
export const EnterpriseBudget = registerModel('EnterpriseBudget', budgetSchema, 'budgets');
export const EnterpriseReimbursement = registerModel('EnterpriseReimbursement', reimbursementSchema, 'reimbursements');
export const EnterpriseNotification = registerModel('EnterpriseNotification', notificationSchema, 'notifications');
export const EnterpriseAuditLog = registerModel('EnterpriseAuditLog', auditLogSchema, 'audit_logs');

export const enterpriseModels = {
  EnterpriseCompany,
  EnterpriseDepartment,
  EnterpriseRoleModel,
  EnterpriseUser,
  EnterprisePolicy,
  EnterpriseExpense,
  EnterpriseReceipt,
  EnterpriseReport,
  EnterpriseApprovalHistory,
  EnterpriseViolation,
  EnterpriseTrip,
  EnterpriseBudget,
  EnterpriseReimbursement,
  EnterpriseNotification,
  EnterpriseAuditLog
};
