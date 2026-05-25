import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    sessionId: String,
    ip: String,
    userAgent: String,
    refreshTokenHash: String,
    active: { type: Boolean, default: true },
    lastSeenAt: Date
  },
  { timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true, select: false },
    employeeId: { type: String, index: true },
    role: {
      type: String,
      enum: ['super_admin', 'company_admin', 'manager', 'finance', 'cfo', 'employee'],
      default: 'employee',
      index: true
    },
    permissions: [{ type: String }],
    department: String,
    designation: String,
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    policyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Policy' },
    budgetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Budget' },
    phone: String,
    bankDetails: {
      bankName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      ifscCode: { type: String, default: '' }
    },
    notificationPreferences: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    status: { type: String, enum: ['active', 'invited', 'suspended'], default: 'active' },
    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String, select: false },
    otp: {
      codeHash: String,
      expiresAt: Date,
      purpose: String
    },
    passwordReset: {
      tokenHash: String,
      expiresAt: Date
    },
    sessions: [sessionSchema]
  },
  { timestamps: true }
);

userSchema.index({ companyId: 1, email: 1 }, { unique: true, sparse: true });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

export const User = mongoose.model('User', userSchema);
