import mongoose from 'mongoose';
import { auditStamp, tenantFields } from './base.js';

const moneySchema = new mongoose.Schema(
  {
    amount: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' }
  },
  { _id: false }
);

const departmentSchema = new mongoose.Schema(
  {
    ...tenantFields,
    name: { type: String, required: true },
    code: { type: String, required: true },
    budget: moneySchema,
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  },
  { timestamps: true }
);

const permissionSchema = new mongoose.Schema(
  {
    ...tenantFields,
    key: { type: String, required: true },
    label: { type: String, required: true },
    module: { type: String, required: true },
    description: String
  },
  { timestamps: true }
);

const roleSchema = new mongoose.Schema(
  {
    ...tenantFields,
    name: { type: String, required: true },
    code: { type: String, required: true },
    description: String,
    permissions: [{ type: String }],
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  },
  { timestamps: true }
);

const expenseCategorySchema = new mongoose.Schema(
  {
    ...tenantFields,
    name: { type: String, required: true },
    code: { type: String, required: true },
    defaultLimit: moneySchema,
    receiptMandatoryAbove: { type: Number, default: 0 },
    glCode: String,
    active: { type: Boolean, default: true },
    limits: {
      perExpense: { type: Number, default: 0 },
      daily: { type: Number, default: 0 },
      monthly: { type: Number, default: 0 },
      roleBased: { type: mongoose.Schema.Types.Mixed, default: {} },
      countryBased: { type: mongoose.Schema.Types.Mixed, default: {} }
    },
    compliance: {
      receiptMandatory: { type: Boolean, default: false },
      ocrMandatory: { type: Boolean, default: false },
      gstMandatory: { type: Boolean, default: false },
      allowedMimetypes: { type: [String], default: ['application/pdf', 'image/png', 'image/jpeg'] }
    },
    accounting: {
      costCenter: String,
      taxCode: String,
      sapSegment: String,
      oracleSegmentId: String
    },
    dynamicFields: { type: mongoose.Schema.Types.Mixed, default: [] },
    workflow: {
      approvalChain: { type: [String], default: ['Manager'] },
      autoApprovalBelow: { type: Number, default: 0 }
    },
    aiSettings: {
      fraudScoreThreshold: { type: Number, default: 40 },
      anomalyDetectionEnabled: { type: Boolean, default: true }
    }
  },
  { timestamps: true }
);

const approvalSchema = new mongoose.Schema(
  {
    ...tenantFields,
    ...auditStamp,
    module: { type: String, enum: ['expense', 'report', 'trip', 'reimbursement'], required: true },
    recordId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approverRole: String,
    step: { type: Number, default: 1 },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'sent_back', 'skipped', 'escalated'], default: 'pending' },
    note: String,
    actedAt: Date
  },
  { timestamps: true }
);

const expenseReportSchema = new mongoose.Schema(
  {
    ...tenantFields,
    ...auditStamp,
    title: { type: String, required: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    expenses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Expense' }],
    totalAmount: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'manager_approved', 'finance_verified', 'reimbursed', 'closed', 'rejected', 'sent_back'],
      default: 'draft'
    },
    submittedAt: Date
  },
  { timestamps: true }
);

const reimbursementSchema = new mongoose.Schema(
  {
    ...tenantFields,
    ...auditStamp,
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reportId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExpenseReport' },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    method: { type: String, enum: ['bank_transfer', 'payroll', 'upi', 'wallet'], default: 'bank_transfer' },
    reference: String,
    failureReason: String,
    retryCount: { type: Number, default: 0 },
    lastAttemptAt: Date,
    status: { type: String, enum: ['pending', 'processing', 'paid', 'failed'], default: 'pending' },
    paidAt: Date
  },
  { timestamps: true }
);

const taxValidationSchema = new mongoose.Schema(
  {
    ...tenantFields,
    ...auditStamp,
    expenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense', required: true },
    reportId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExpenseReport' },
    taxType: { type: String, enum: ['GST', 'VAT', 'NONE'], default: 'GST' },
    taxId: String,
    taxableAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    expectedTaxAmount: { type: Number, default: 0 },
    status: { type: String, enum: ['valid', 'mismatch', 'missing_tax_id', 'not_applicable'], default: 'not_applicable' },
    findings: [{ code: String, message: String, severity: String }]
  },
  { timestamps: true }
);

const paymentTransactionSchema = new mongoose.Schema(
  {
    ...tenantFields,
    ...auditStamp,
    reimbursementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reimbursement', required: true },
    provider: { type: String, default: 'manual_bank' },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    reference: String,
    status: { type: String, enum: ['initiated', 'processing', 'paid', 'failed', 'retrying'], default: 'initiated' },
    failureReason: String,
    retryCount: { type: Number, default: 0 },
    processedAt: Date
  },
  { timestamps: true }
);

const accountingExportSchema = new mongoose.Schema(
  {
    ...tenantFields,
    ...auditStamp,
    exportNo: { type: String, required: true },
    format: { type: String, enum: ['csv', 'json'], default: 'csv' },
    status: { type: String, enum: ['generated', 'pushed', 'failed'], default: 'generated' },
    period: { start: Date, end: Date },
    recordCount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    fileUrl: String,
    erpTarget: String,
    error: String
  },
  { timestamps: true }
);

const erpIntegrationSchema = new mongoose.Schema(
  {
    ...tenantFields,
    name: { type: String, required: true },
    provider: { type: String, enum: ['zoho_books', 'tally', 'quickbooks', 'sap', 'custom'], default: 'custom' },
    baseUrl: String,
    authType: { type: String, enum: ['api_key', 'oauth2', 'basic', 'none'], default: 'none' },
    config: mongoose.Schema.Types.Mixed,
    active: { type: Boolean, default: false },
    lastSyncAt: Date,
    lastSyncStatus: String
  },
  { timestamps: true }
);

const projectSchema = new mongoose.Schema(
  {
    ...tenantFields,
    name: { type: String, required: true },
    code: { type: String, required: true },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    budget: moneySchema,
    status: { type: String, enum: ['active', 'on_hold', 'closed'], default: 'active' }
  },
  { timestamps: true }
);

const ocrLogSchema = new mongoose.Schema(
  {
    ...tenantFields,
    receiptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Receipt' },
    expenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense' },
    provider: { type: String, default: 'local-parser' },
    status: { type: String, enum: ['queued', 'processing', 'completed', 'failed'], default: 'queued' },
    extracted: mongoose.Schema.Types.Mixed,
    duplicateScore: { type: Number, default: 0 },
    fraudScore: { type: Number, default: 0 },
    error: String
  },
  { timestamps: true }
);

const activityLogSchema = new mongoose.Schema(
  {
    ...tenantFields,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    module: String,
    summary: String,
    metadata: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

departmentSchema.index({ companyId: 1, code: 1 }, { unique: true });
permissionSchema.index({ companyId: 1, key: 1 }, { unique: true });
roleSchema.index({ companyId: 1, code: 1 }, { unique: true });
expenseCategorySchema.index({ companyId: 1, code: 1 }, { unique: true });
projectSchema.index({ companyId: 1, code: 1 }, { unique: true });
approvalSchema.index({ companyId: 1, module: 1, recordId: 1, step: 1 });
taxValidationSchema.index({ companyId: 1, expenseId: 1 });
paymentTransactionSchema.index({ companyId: 1, reimbursementId: 1, status: 1 });
accountingExportSchema.index({ companyId: 1, exportNo: 1 }, { unique: true });

export const Department = mongoose.model('Department', departmentSchema);
export const Permission = mongoose.model('Permission', permissionSchema);
export const EnterpriseRole = mongoose.model('EnterpriseRole', roleSchema);
export const ExpenseCategory = mongoose.model('ExpenseCategory', expenseCategorySchema);
export const Approval = mongoose.model('Approval', approvalSchema);
export const ExpenseReport = mongoose.model('ExpenseReport', expenseReportSchema);
export const Reimbursement = mongoose.model('Reimbursement', reimbursementSchema);
export const TaxValidation = mongoose.model('TaxValidation', taxValidationSchema);
export const PaymentTransaction = mongoose.model('PaymentTransaction', paymentTransactionSchema);
export const AccountingExport = mongoose.model('AccountingExport', accountingExportSchema);
export const ErpIntegration = mongoose.model('ErpIntegration', erpIntegrationSchema);
export const Project = mongoose.model('Project', projectSchema);
export const OcrLog = mongoose.model('OcrLog', ocrLogSchema);
export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
