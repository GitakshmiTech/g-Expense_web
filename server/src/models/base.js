import mongoose from 'mongoose';

export const tenantFields = {
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true, required: true }
};

export const auditStamp = {
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
};
