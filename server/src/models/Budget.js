import mongoose from 'mongoose';
import { tenantFields } from './base.js';

const budgetSchema = new mongoose.Schema(
  {
    ...tenantFields,
    name: String,
    type: { type: String, enum: ['department', 'project'], required: true },
    department: String,
    projectCode: String,
    period: { start: Date, end: Date },
    amount: Number,
    consumed: { type: Number, default: 0 },
    thresholds: [{ percentage: Number, channel: String, recipients: [String] }],
    status: { type: String, enum: ['active', 'closed'], default: 'active' }
  },
  { timestamps: true }
);

budgetSchema.index({ companyId: 1, type: 1, department: 1, projectCode: 1 });

export const Budget = mongoose.model('Budget', budgetSchema);
