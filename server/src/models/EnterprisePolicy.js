import mongoose from 'mongoose';
import { tenantFields } from './base.js';

const enterprisePolicySchema = new mongoose.Schema(
  {
    ...tenantFields,
    name: { type: String, required: true },
    code: { type: String, required: true, index: true },
    description: String,
    status: { type: String, enum: ['active', 'draft', 'archived'], default: 'draft', index: true },
    effectiveDate: Date,
    expiryDate: Date,
    priority: { type: Number, default: 0 },
    
    // 1. Basic Mapping Configurations
    mapping: {
      departmentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],
      designationIds: [{ type: String }],
      gradeIds: [{ type: String }],
      locationMapping: [{ type: String }]
    },

    // 2. Expense Limit Engine
    limits: {
      perExpense: Number,
      daily: Number,
      weekly: Number,
      monthly: Number,
      yearly: Number,
      currency: { type: String, default: 'INR' },
      limitType: { type: String, enum: ['soft', 'hard', 'warning'], default: 'hard' }
    },

    // 3. Receipt Policy Engine
    receiptPolicy: {
      mandatory: { type: Boolean, default: false },
      requiredAboveAmount: Number,
      ocrMandatory: { type: Boolean, default: false },
      allowedFileTypes: [{ type: String }],
      maxFileSizeBytes: Number,
      receiptAgeLimitDays: Number
    },

    // 4. Approval Workflow Engine
    approvalFlow: [{
      level: Number,
      condition: {
         amountGreaterThan: Number,
         amountLessThan: Number
      },
      approvers: [{ type: String, enum: ['Manager', 'Finance', 'CFO'] }],
      autoApproveLimit: Number,
      escalationDays: Number,
      type: { type: String, enum: ['Sequential', 'Parallel'], default: 'Sequential' }
    }],

    // 5. Travel Policy Module
    travelPolicy: {
      hotelLimit: Number,
      foodLimit: Number,
      cabLimit: Number,
      mileageRate: Number,
      fuelLimit: Number,
      perDiemAmount: Number,
      travelClass: [{ type: String }]
    },

    // 6. Compliance Engine & 7. Restrictions
    compliance: {
      gstMandatory: { type: Boolean, default: false },
      duplicateDetection: { type: Boolean, default: false },
      taxValidation: { type: Boolean, default: false },
      weekendRestriction: { type: Boolean, default: false },
      holidayRestriction: { type: Boolean, default: false },
      futureDateRestriction: { type: Boolean, default: false },
      blockedMerchants: [{ type: String }],
      blockedCategories: [{ type: String }],
      submissionDeadlineDays: Number,
      violationAction: { type: String, enum: ['Warning', 'AutoReject', 'RequireApproval', 'FlagFraud'], default: 'Warning' }
    },

    // 10. Dynamic Rule Builder
    customRules: [{
      name: String,
      conditions: [{
        field: String,
        operator: String, // 'equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'in_array'
        value: mongoose.Schema.Types.Mixed
      }],
      logicalOperator: { type: String, enum: ['AND', 'OR'], default: 'AND' },
      actions: [{
        actionType: String, // 'require_approval', 'reject', 'warn', 'flag'
        actionValue: mongoose.Schema.Types.Mixed
      }]
    }],

    // 11. Configurations
    auditConfig: { 
      trackEdits: { type: Boolean, default: true } 
    },
    notificationConfig: { 
      email: { type: Boolean, default: true }, 
      inApp: { type: Boolean, default: true }, 
      push: { type: Boolean, default: false } 
    }
  },
  { timestamps: true }
);

// Indexes for faster lookups
enterprisePolicySchema.index({ companyId: 1, status: 1 });
enterprisePolicySchema.index({ companyId: 1, 'mapping.departmentIds': 1 });

export const EnterprisePolicy = mongoose.model('EnterprisePolicy', enterprisePolicySchema);
