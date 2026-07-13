import { ExpenseCategory } from '../models/Enterprise.js';

export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Meals', code: 'MEALS', glCode: '600101', receiptMandatoryAbove: 1000, limits: { perExpense: 5000 } },
  { name: 'Travel', code: 'TRAVEL', glCode: '600201', receiptMandatoryAbove: 1000, limits: { perExpense: 25000 }, dynamicFields: [{ fieldId: 'trip_reference', label: 'Trip Reference', type: 'TEXT', isRequired: false }] },
  { name: 'Hotel', code: 'HOTEL', glCode: '600301', receiptMandatoryAbove: 0, limits: { perExpense: 10000 }, compliance: { receiptMandatory: true, gstMandatory: true } },
  { name: 'Fuel', code: 'FUEL', glCode: '600401', receiptMandatoryAbove: 500, limits: { perExpense: 5000 } },
  { name: 'Software', code: 'SOFTWARE', glCode: '600501', receiptMandatoryAbove: 0, limits: { perExpense: 20000 }, compliance: { receiptMandatory: true } },
  { name: 'Office Supplies', code: 'OFFICE_SUPPLIES', glCode: '600601', receiptMandatoryAbove: 1000, limits: { perExpense: 8000 } },
  { name: 'Telecom', code: 'TELECOM', glCode: '600701', receiptMandatoryAbove: 1000, limits: { perExpense: 3000 } },
  { name: 'Training', code: 'TRAINING', glCode: '600801', receiptMandatoryAbove: 0, limits: { perExpense: 30000 }, compliance: { receiptMandatory: true } },
  { name: 'Mileage', code: 'MILEAGE', glCode: '600901', receiptMandatoryAbove: 0, limits: { perExpense: 10000 }, dynamicFields: [{ fieldId: 'distance_km', label: 'Distance in KM', type: 'NUMBER', isRequired: true }] }
];

const buildDefaultCategory = (companyId, actorId, category) => ({
  ...category,
  companyId,
  active: true,
  defaultLimit: { amount: Number(category.limits?.perExpense || 0), currency: 'INR' },
  limits: {
    perExpense: Number(category.limits?.perExpense || 0),
    daily: 0,
    monthly: 0,
    roleBased: {},
    countryBased: {}
  },
  compliance: {
    receiptMandatory: Boolean(category.compliance?.receiptMandatory),
    ocrMandatory: Boolean(category.compliance?.ocrMandatory),
    gstMandatory: Boolean(category.compliance?.gstMandatory),
    allowedMimetypes: ['application/pdf', 'image/png', 'image/jpeg']
  },
  accounting: {},
  dynamicFields: category.dynamicFields || [],
  workflow: { approvalChain: ['Manager'], autoApprovalBelow: 0 },
  aiSettings: { fraudScoreThreshold: 40, anomalyDetectionEnabled: true },
  createdBy: actorId,
  updatedBy: actorId
});

export const ensureExpenseCategoryCatalog = async ({ companyId, actorId }) => {
  if (!companyId) {
    return ExpenseCategory.find({ active: true }).sort({ name: 1 });
  }
  const existingCount = await ExpenseCategory.countDocuments({ companyId });
  if (!existingCount) {
    await ExpenseCategory.insertMany(DEFAULT_EXPENSE_CATEGORIES.map((category) => buildDefaultCategory(companyId, actorId, category)), { ordered: false });
  }
  return ExpenseCategory.find({ companyId, active: true }).sort({ name: 1 });
};

export const findActiveExpenseCategory = async ({ companyId, category, actorId }) => {
  await ensureExpenseCategoryCatalog({ companyId, actorId });
  return ExpenseCategory.findOne({
    companyId,
    active: true,
    $or: [{ name: category }, { code: category }]
  });
};
