import mongoose from 'mongoose';
import { tenantFields } from './base.js';

const permissionSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    module: String,
    description: String
  },
  { timestamps: true }
);

const roleSchema = new mongoose.Schema(
  {
    ...tenantFields,
    name: { type: String, required: true },
    code: { type: String, required: true },
    permissions: [{ type: String }]
  },
  { timestamps: true }
);

roleSchema.index({ companyId: 1, code: 1 }, { unique: true });

export const Permission = mongoose.model('Permission', permissionSchema);
export const Role = mongoose.model('Role', roleSchema);
