import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

export const tenantField = {
  companyId: { type: ObjectId, ref: 'Company', required: true, index: true }
};

export const auditFields = {
  createdBy: { type: ObjectId, ref: 'User', index: true },
  updatedBy: { type: ObjectId, ref: 'User' },
  deletedBy: { type: ObjectId, ref: 'User' }
};

export const softDeleteFields = {
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: Date,
  deleteReason: String
};

export const moneySchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true, trim: true, minlength: 3, maxlength: 3, default: 'INR' },
    baseAmount: { type: Number, min: 0 },
    baseCurrency: { type: String, uppercase: true, trim: true, minlength: 3, maxlength: 3, default: 'INR' },
    fxRate: { type: Number, min: 0, default: 1 }
  },
  { _id: false }
);

export const lifecycleSchema = new mongoose.Schema(
  {
    status: { type: String, required: true, index: true },
    reason: String,
    changedBy: { type: ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

export function enterpriseBasePlugin(schema, options = {}) {
  if (options.tenant !== false) schema.add(tenantField);
  schema.add(auditFields);
  schema.add(softDeleteFields);

  schema.set('timestamps', true);
  schema.set('toJSON', { virtuals: true });
  schema.set('toObject', { virtuals: true });

  schema.index({ companyId: 1, isDeleted: 1, createdAt: -1 });
  schema.index({ companyId: 1, updatedAt: -1 });

  schema.query.active = function active() {
    return this.where({ isDeleted: false });
  };

  schema.statics.softDeleteById = function softDeleteById(id, actorId, reason) {
    return this.findByIdAndUpdate(
      id,
      { isDeleted: true, deletedAt: new Date(), deletedBy: actorId, deleteReason: reason },
      { new: true }
    );
  };

  schema.pre(/^find/, function excludeDeleted(next) {
    if (!this.getOptions().includeDeleted) this.where({ isDeleted: false });
    next();
  });
}

export const objectId = (ref, required = false) => ({ type: ObjectId, ref, required, index: true });
