import Joi from 'joi';

export const managerActionSchema = Joi.object({
  targetType: Joi.string().valid('expense', 'report', 'trip', 'advance').required(),
  id: Joi.string().required(),
  action: Joi.string().valid('approve', 'reject', 'send_back', 'escalate').required(),
  note: Joi.string().allow('', null)
});

export const managerBulkActionSchema = Joi.object({
  targetType: Joi.string().valid('expense', 'report', 'trip', 'advance').required(),
  ids: Joi.array().items(Joi.string()).min(1).required(),
  action: Joi.string().valid('approve', 'reject', 'send_back', 'escalate').required(),
  note: Joi.string().allow('', null)
});
