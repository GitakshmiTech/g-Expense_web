import mongoose from 'mongoose';
import { auditStamp, tenantFields } from './base.js';

const permissionGrantSchema = new mongoose.Schema(
  {
    page: { type: String, required: true, trim: true },
    action: { type: String, required: true, trim: true },
    allowed: { type: Boolean, default: true }
  },
  { _id: false }
);

const pageRegistrySchema = new mongoose.Schema(
  {
    ...tenantFields,
    ...auditStamp,
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    path: { type: String, required: true, trim: true },
    actions: [{ type: String, required: true }],
    order: { type: Number, default: 0 },
    panel: { type: String, enum: ['company_admin'], default: 'company_admin' },
    isSystem: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    deletedAt: Date
  },
  { timestamps: true, collection: 'page_registry' }
);

const permissionSchema = new mongoose.Schema(
  {
    ...tenantFields,
    ...auditStamp,
    key: { type: String, required: true, trim: true },
    page: { type: String, required: true, trim: true },
    action: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    description: String,
    isSystem: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    deletedAt: Date
  },
  { timestamps: true, collection: 'permissions' }
);

const roleSchema = new mongoose.Schema(
  {
    ...tenantFields,
    ...auditStamp,
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, lowercase: true },
    description: String,
    parentRoleId: { type: mongoose.Schema.Types.ObjectId, ref: 'RbacRole' },
    hierarchyLevel: { type: Number, default: 0 },
    permissions: [permissionGrantSchema],
    isSystem: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    deletedAt: Date
  },
  { timestamps: true, collection: 'roles' }
);

const employeePermissionSchema = new mongoose.Schema(
  {
    ...tenantFields,
    ...auditStamp,
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    roleIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'RbacRole' }],
    permissions: [permissionGrantSchema],
    deniedPermissions: [permissionGrantSchema],
    isActive: { type: Boolean, default: true },
    deletedAt: Date
  },
  { timestamps: true, collection: 'employee_permissions' }
);

pageRegistrySchema.index({ companyId: 1, key: 1, deletedAt: 1 }, { unique: true });
pageRegistrySchema.index({ companyId: 1, isActive: 1, order: 1 });
permissionSchema.index({ companyId: 1, key: 1, deletedAt: 1 }, { unique: true });
permissionSchema.index({ companyId: 1, page: 1, action: 1 });
roleSchema.index({ companyId: 1, code: 1, deletedAt: 1 }, { unique: true });
roleSchema.index({ companyId: 1, parentRoleId: 1, isActive: 1 });
employeePermissionSchema.index({ companyId: 1, employeeId: 1, deletedAt: 1 }, { unique: true });

export const PageRegistry = mongoose.models.PageRegistry || mongoose.model('PageRegistry', pageRegistrySchema);
export const RbacPermission = mongoose.models.RbacPermission || mongoose.model('RbacPermission', permissionSchema);
export const RbacRole = mongoose.models.RbacRole || mongoose.model('RbacRole', roleSchema);
export const EmployeePermission = mongoose.models.EmployeePermission || mongoose.model('EmployeePermission', employeePermissionSchema);
