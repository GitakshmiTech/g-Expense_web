import { ApiError } from '../helpers/apiError.js';

const hasUnsafeKey = (value) => {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(hasUnsafeKey);
  return Object.entries(value).some(([key, nested]) => key.startsWith('$') || key.includes('.') || hasUnsafeKey(nested));
};

export const rejectNoSqlOperators = (req, res, next) => {
  if (hasUnsafeKey(req.body) || hasUnsafeKey(req.query) || hasUnsafeKey(req.params)) {
    return next(new ApiError(400, 'Request contains unsupported operator keys'));
  }
  return next();
};
