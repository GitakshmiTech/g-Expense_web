import Joi from 'joi';

export const loginSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().required(),
  otp: Joi.string().allow('')
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required()
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(8).required()
});
