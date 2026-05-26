import mongoose from 'mongoose';

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true },
    companyCode: { type: String, unique: true },
    legalName: String,
    domain: { type: String, lowercase: true, trim: true },
    baseCurrency: { type: String, default: 'INR' },
    country: { type: String, default: 'IN' },
    status: { type: String, enum: ['trial', 'active', 'suspended', 'cancelled'], default: 'trial' },
    logo: String,
    phone: String,
    companyType: String,
    gstNumber: String,
    panNumber: String,
    registrationNo: String,
    state: String,
    officeAddress: String,
    adminEmail: String,
    adminName: String,
    adminPassword: { type: String, default: 'Admin@12345' },
    subscription: {
      plan: { type: String, default: 'Enterprise' },
      seats: { type: Number, default: 100 },
      expiresAt: Date,
      billingEmail: String
    },
    limits: {
      users: { type: Number, default: 100 },
      monthlyExpenses: { type: Number, default: 10000 },
      storageGb: { type: Number, default: 25 }
    },
    features: {
      travel: { type: Boolean, default: true },
      budgets: { type: Boolean, default: true },
      ocr: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      advancedFraud: { type: Boolean, default: true }
    }
  },
  { timestamps: true }
);

companySchema.pre('save', async function (next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now();
  }
  if (!this.companyCode) {
    const count = await mongoose.model('Company').countDocuments();
    const prefix = this.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
    const suffix = String(count + 1).padStart(3, '0');
    this.companyCode = `${prefix}${suffix}`;
  }
  next();
});

export const Company = mongoose.model('Company', companySchema);
