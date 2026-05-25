import mongoose from 'mongoose';
import { tenantFields } from './base.js';

const travelSchema = new mongoose.Schema(
  {
    ...tenantFields,
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: String,
    source: String,
    destination: String,
    startDate: Date,
    endDate: Date,
    estimatedCost: Number,
    purpose: String,
    status: { type: String, enum: ['draft', 'submitted', 'approved', 'rejected', 'completed'], default: 'draft' },
    approvals: [{ approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, status: String, note: String, actedAt: Date }]
  },
  { timestamps: true }
);

export const Travel = mongoose.model('Travel', travelSchema);
