import Joi from 'joi';

export const expenseSchema = Joi.object({
  category: Joi.string().required(),
  merchant: Joi.string().allow(''),
  expenseDate: Joi.date().required(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().default('INR'),
  convertedAmount: Joi.number(),
  taxAmount: Joi.number().default(0),
  gstNumber: Joi.string().allow(''),
  paymentMode: Joi.string().valid('cash', 'card', 'bank', 'upi', 'corporate_card').default('card'),
  description: Joi.string().allow(''),
  status: Joi.string().valid('draft', 'submitted', 'DRAFT', 'SUBMITTED').default('DRAFT'),
  mileage: Joi.object({ distance: Joi.number(), unit: Joi.string(), rate: Joi.number() }),
  perDiem: Joi.object({ city: Joi.string(), days: Joi.number(), rate: Joi.number() }),
  tripId: Joi.string().allow(null, ''),
  sharedExpense: Joi.object({
    enabled: Joi.boolean().default(false),
    participantIds: Joi.array().items(Joi.string()).min(1),
    splitType: Joi.string().valid('equal', 'percentage', 'custom').default('equal'),
    splitValues: Joi.object().pattern(Joi.string(), Joi.number().min(0)).default({}),
    reimbursementMode: Joi.string().valid('creator_full', 'individual').default('creator_full')
  }).optional(),
  participantIds: Joi.array().items(Joi.string()).optional(),
  splitType: Joi.string().valid('equal', 'percentage', 'custom').optional(),
  splitValues: Joi.object().pattern(Joi.string(), Joi.number().min(0)).optional(),
  reimbursementMode: Joi.string().valid('creator_full', 'individual').optional(),
  receiptFile: Joi.object({
    fileName: Joi.string().required(),
    originalName: Joi.string().required(),
    mimeType: Joi.string().required(),
    path: Joi.string().required(),
    size: Joi.number().required(),
    fileHash: Joi.string().allow('', null),
    ocr: Joi.object().unknown(true).optional()
  }).optional()
});
