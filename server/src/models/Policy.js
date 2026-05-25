import mongoose from 'mongoose';
import { tenantFields } from './base.js';

const policySchema = new mongoose.Schema(
  {
    ...tenantFields,
    name: String,
    appliesTo: {
      countries: [String],
      roles: [String],
      departments: [String]
    },
    rules: [
      {
        category: String,
        maxAmount: Number,
        currency: { type: String, default: 'INR' },
        receiptRequiredAbove: Number,
        severity: { type: String, enum: ['warning', 'block'], default: 'warning' }
      }
    ],
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const Policy = mongoose.model('Policy', policySchema);
