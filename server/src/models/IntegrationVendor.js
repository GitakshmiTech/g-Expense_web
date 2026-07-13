import mongoose from 'mongoose';
import { tenantFields } from './base.js';

const integrationVendorSchema = new mongoose.Schema(
  {
    ...tenantFields,
    sourceSystem: { type: String, default: 'asset-management', index: true },
    sourceId: { type: String, index: true },
    name: { type: String, required: true, trim: true },
    contactPerson: String,
    email: { type: String, lowercase: true, trim: true },
    phone: String,
    gstNumber: String,
    category: String,
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    active: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

integrationVendorSchema.index({ companyId: 1, sourceSystem: 1, sourceId: 1 }, { unique: true, sparse: true });
integrationVendorSchema.index({ companyId: 1, name: 1 });

export const IntegrationVendor =
  mongoose.models.IntegrationVendor || mongoose.model('IntegrationVendor', integrationVendorSchema, 'integration_vendors');
