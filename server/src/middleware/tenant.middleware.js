import { ApiError } from '../helpers/apiError.js';

export const enforceTenant = (req, res, next) => {
  if (req.user?.role === 'super_admin') return next();
  if (!req.companyId) return next(new ApiError(403, 'Tenant context is missing'));
  next();
};

export const tenantFilter = (req) => (req.user?.role === 'super_admin' ? {} : { companyId: req.companyId });
