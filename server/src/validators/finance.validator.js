import Joi from 'joi';

export const financeVerificationSchema = Joi.object({
  reportId: Joi.string().required(),
  action: Joi.string().valid('verify', 'reject', 'send_back').required(),
  note: Joi.string().allow('', null)
});

export const reimbursementProcessSchema = Joi.object({
  status: Joi.string().valid('processing', 'paid', 'failed').required(),
  reference: Joi.string().allow('', null),
  failureReason: Joi.string().allow('', null)
});

export const retryPaymentSchema = Joi.object({
  reference: Joi.string().allow('', null)
});

export const erpIntegrationSchema = Joi.object({
  name: Joi.string().required(),
  provider: Joi.string().valid('zoho_books', 'tally', 'quickbooks', 'sap', 'custom').default('custom'),
  baseUrl: Joi.string().allow('', null),
  authType: Joi.string().valid('api_key', 'oauth2', 'basic', 'none').default('none'),
  config: Joi.object().unknown(true).default({}),
  active: Joi.boolean().default(false)
});
