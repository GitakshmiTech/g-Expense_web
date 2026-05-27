import mongoose from 'mongoose';
import { auditStamp, tenantFields } from './base.js';
import { EXPENSE_STATUSES } from '../constants/expenseLifecycle.js';

const receiptSchema = new mongoose.Schema(
  {
    ...tenantFields,
    expenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense' },
    fileName: String,
    originalName: String,
    mimeType: String,
    path: String,
    size: Number,
    ocr: {
      merchant: String,
      date: Date,
      tax: Number,
      amount: Number,
      gstNumber: String,
      invoiceNumber: String,
      currency: String,
      confidence: Number,
      rawText: String,
      rawResponse: mongoose.Schema.Types.Mixed,
      provider: { type: String, default: 'gemini' },
      failedReason: String
    },
    fileHash: { type: String, index: true },
    scanStatus: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' }
  },
  { timestamps: true }
);

const expenseSchema = new mongoose.Schema(
  {
    ...tenantFields,
    ...auditStamp,
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Travel' },
    category: { type: String, required: true },
    merchant: String,
    expenseDate: { type: Date, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    convertedAmount: Number,
    baseCurrency: { type: String, default: 'INR' },
    taxAmount: { type: Number, default: 0 },
    gstNumber: String,
    invoiceNumber: String,
    totalAmount: Number,
    isSharedExpense: { type: Boolean, default: false, index: true },
    splitType: { type: String, enum: ['equal', 'percentage', 'custom'] },
    participantCount: { type: Number, default: 0 },
    reimbursementMode: { type: String, enum: ['creator_full', 'individual'], default: 'creator_full' },
    sharedExpenseMeta: {
      allocationTotal: { type: Number, default: 0 },
      taxAllocationTotal: { type: Number, default: 0 },
      validationStatus: { type: String, enum: ['not_shared', 'valid', 'invalid'], default: 'not_shared' },
      lastCalculatedAt: Date
    },
    reportId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExpenseReport', index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    advanceRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdvanceRequest' },
    paymentMode: { type: String, enum: ['cash', 'card', 'bank', 'upi', 'corporate_card'], default: 'card' },
    description: String,
    status: {
      type: String,
      enum: [...EXPENSE_STATUSES, 'draft', 'submitted', 'manager_review', 'finance_review', 'cfo_review', 'approved', 'rejected', 'sent_back', 'paid', 'reimbursed', 'closed'],
      default: 'DRAFT',
      index: true
    },
    recovery: {
      required: { type: Boolean, default: false },
      amount: { type: Number, default: 0 },
      reason: String,
      status: { type: String, enum: ['not_required', 'pending', 'recovered', 'waived'], default: 'not_required' }
    },
    split: [{ department: String, projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' }, amount: Number, percentage: Number }],
    attachments: [{ fileName: String, originalName: String, mimeType: String, path: String, size: Number }],
    timeline: [{ status: String, action: String, actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, note: String, at: { type: Date, default: Date.now } }],
    mileage: {
      distance: Number,
      unit: { type: String, default: 'km' },
      rate: Number
    },
    perDiem: {
      city: String,
      days: Number,
      rate: Number
    },
    policyViolations: [{ code: String, message: String, severity: String }],
    fraudFlags: [{ code: String, message: String, score: Number }],
    approvalPath: [{ approverRole: String, approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, status: String, actedAt: Date, note: String }],
    receipts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Receipt' }],
    customFields: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

expenseSchema.index({ companyId: 1, expenseDate: -1 });
expenseSchema.index({ companyId: 1, employeeId: 1, amount: 1, merchant: 1, expenseDate: 1 });

export const Receipt = mongoose.model('Receipt', receiptSchema);
export const Expense = mongoose.model('Expense', expenseSchema);
