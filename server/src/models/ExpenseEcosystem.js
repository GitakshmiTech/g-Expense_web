import mongoose from 'mongoose';
import { auditStamp, tenantFields } from './base.js';

const actorSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: String,
    name: String
  },
  { _id: false }
);

const moneySchema = new mongoose.Schema(
  {
    amount: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' }
  },
  { _id: false }
);

const commentSchema = new mongoose.Schema(
  {
    ...tenantFields,
    expenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense', index: true },
    reportId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExpenseReport', index: true },
    body: { type: String, required: true },
    visibility: { type: String, enum: ['employee', 'approver', 'finance', 'internal'], default: 'employee' },
    attachments: [{ fileName: String, path: String, mimeType: String, size: Number }],
    actor: actorSchema
  },
  { timestamps: true }
);

const expenseAuditLogSchema = new mongoose.Schema(
  {
    ...tenantFields,
    expenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense', index: true },
    reportId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExpenseReport', index: true },
    action: { type: String, required: true, index: true },
    actor: actorSchema,
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
    metadata: mongoose.Schema.Types.Mixed,
    ip: String,
    userAgent: String
  },
  { timestamps: true }
);

const fraudLogSchema = new mongoose.Schema(
  {
    ...tenantFields,
    expenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense', required: true, index: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    signal: { type: String, required: true },
    message: String,
    score: { type: Number, min: 0, max: 100, default: 0, index: true },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    status: { type: String, enum: ['open', 'reviewed', 'waived', 'confirmed'], default: 'open', index: true },
    evidence: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

const travelRequestSchema = new mongoose.Schema(
  {
    ...tenantFields,
    ...auditStamp,
    travelId: { type: String, index: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    purpose: String,
    businessJustification: String,
    department: String,
    clientName: String,
    projectCode: String,
    costCenter: String,
    sourceCountry: String,
    sourceState: String,
    source: String,
    destinationCountry: String,
    destinationState: String,
    destination: { type: String, required: true },
    travelType: { type: String, enum: ['domestic', 'international'], default: 'domestic' },
    flexibleTravel: { type: Boolean, default: false },
    multiCity: { type: Boolean, default: false },
    extraCities: String,
    startDate: Date,
    endDate: Date,
    budget: moneySchema,
    estimate: mongoose.Schema.Types.Mixed,
    booking: mongoose.Schema.Types.Mixed,
    hotel: mongoose.Schema.Types.Mixed,
    meals: mongoose.Schema.Types.Mixed,
    advance: mongoose.Schema.Types.Mixed,
    policyAlerts: [{ code: String, title: String, detail: String, severity: String }],
    itinerary: [{ mode: String, from: String, to: String, startsAt: Date, endsAt: Date, reference: String }],
    assetRequests: [{
      assetId: String,
      assetName: String,
      assetCode: String,
      category: String,
      notes: String,
      status: { type: String, enum: ['requested', 'assigned', 'failed', 'returned'], default: 'requested' }
    }],
    assetAllocation: {
      status: { type: String, enum: ['not_requested', 'pending', 'assigned', 'partial', 'failed'], default: 'not_requested' },
      assignedAt: Date,
      response: mongoose.Schema.Types.Mixed,
      error: String
    },
    attachments: [{ fileName: String, path: String, mimeType: String, size: Number }],
    linkedExpenses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Expense' }],
    approvalPath: [{ approverRole: String, approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, status: String, actedAt: Date, note: String }],
    timeline: [{ status: String, action: String, actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, note: String, at: { type: Date, default: Date.now } }],
    status: { type: String, enum: ['DRAFT', 'SUBMITTED', 'PENDING_MANAGER', 'PENDING_FINANCE', 'PENDING_CFO', 'APPROVED', 'REJECTED', 'SETTLEMENT_PENDING', 'SETTLED', 'CLOSED'], default: 'DRAFT', index: true }
  },
  { timestamps: true }
);

const advanceRequestSchema = new mongoose.Schema(
  {
    ...tenantFields,
    ...auditStamp,
    advanceNo: { type: String, index: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    travelRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'TravelRequest' },
    purpose: { type: String, required: true },
    requested: moneySchema,
    released: moneySchema,
    adjustedAmount: { type: Number, default: 0 },
    settlementType: { type: String, enum: ['pending', 'extra_reimbursement', 'refund_recovery', 'exact_settlement'], default: 'pending' },
    paymentReference: String,
    approvalPath: [{ approverRole: String, approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, status: String, actedAt: Date, note: String }],
    status: { type: String, enum: ['DRAFT', 'SUBMITTED', 'PENDING_MANAGER', 'PENDING_FINANCE', 'RELEASED', 'SETTLED', 'REJECTED', 'CLOSED'], default: 'DRAFT', index: true }
  },
  { timestamps: true }
);

const expenseParticipantSchema = new mongoose.Schema(
  {
    ...tenantFields,
    expenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense', required: true, index: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    employeeName: { type: String, required: true },
    departmentId: String,
    branchId: String,
    participationType: { type: String, enum: ['creator', 'participant'], default: 'participant', index: true },
    approvalStatus: { type: String, enum: ['pending', 'acknowledged', 'approved', 'rejected', 'removed'], default: 'pending', index: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

const expenseSplitAllocationSchema = new mongoose.Schema(
  {
    ...tenantFields,
    expenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense', required: true, index: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    allocatedAmount: { type: Number, required: true, min: 0 },
    allocatedTaxAmount: { type: Number, default: 0, min: 0 },
    splitPercentage: { type: Number, default: 0, min: 0, max: 100 },
    reimbursementStatus: { type: String, enum: ['not_due', 'pending', 'processing', 'paid', 'failed'], default: 'pending', index: true },
    ledgerStatus: { type: String, enum: ['pending', 'posted', 'reversed'], default: 'pending', index: true },
    reimbursementMode: { type: String, enum: ['creator_full', 'individual'], default: 'creator_full' },
    policyViolations: [{ code: String, message: String, severity: String }],
    settledAt: Date
  },
  { timestamps: true }
);

commentSchema.index({ companyId: 1, expenseId: 1, createdAt: -1 });
expenseAuditLogSchema.index({ companyId: 1, expenseId: 1, createdAt: -1 });
fraudLogSchema.index({ companyId: 1, score: -1, status: 1 });
travelRequestSchema.index({ companyId: 1, travelId: 1 }, { unique: true, sparse: true });
advanceRequestSchema.index({ companyId: 1, advanceNo: 1 }, { unique: true, sparse: true });
expenseParticipantSchema.index({ companyId: 1, expenseId: 1, employeeId: 1 }, { unique: true });
expenseSplitAllocationSchema.index({ companyId: 1, expenseId: 1, employeeId: 1 }, { unique: true });

export const ExpenseComment = mongoose.models.ExpenseComment || mongoose.model('ExpenseComment', commentSchema, 'expense_comments');
export const ExpenseAuditLog = mongoose.models.ExpenseAuditLog || mongoose.model('ExpenseAuditLog', expenseAuditLogSchema, 'expense_audit_logs');
export const FraudLog = mongoose.models.FraudLog || mongoose.model('FraudLog', fraudLogSchema, 'fraud_logs');
export const TravelRequest = mongoose.models.TravelRequest || mongoose.model('TravelRequest', travelRequestSchema, 'travel_requests');
export const AdvanceRequest = mongoose.models.AdvanceRequest || mongoose.model('AdvanceRequest', advanceRequestSchema, 'advance_requests');
export const ExpenseParticipant = mongoose.models.ExpenseParticipant || mongoose.model('ExpenseParticipant', expenseParticipantSchema, 'expense_participants');
export const ExpenseSplitAllocation = mongoose.models.ExpenseSplitAllocation || mongoose.model('ExpenseSplitAllocation', expenseSplitAllocationSchema, 'expense_split_allocations');
