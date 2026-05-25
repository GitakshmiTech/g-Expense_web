import { ApiError } from '../helpers/apiError.js';
import { MODULE_PAGE_MAP } from '../rbac/companyAdmin.pages.js';
import { hasPermission } from '../services/permission.service.js';

export const requireCompanyAdminPanel = (req, _res, next) => {
  if (req.user?.role === 'super_admin') return next();
  if (!req.companyId) return next(new ApiError(403, 'Company context is required'));
  return next();
};

export const requirePermission = (page, action = 'view') => async (req, _res, next) => {
  try {
    if (await hasPermission(req.user, page, action)) return next();
    return next(new ApiError(403, `Missing permission: ${page}:${action}`));
  } catch (error) {
    return next(error);
  }
};

export const requireEnterprisePermission = (action = 'view') => async (req, _res, next) => {
  const page = MODULE_PAGE_MAP[req.params.module] || req.params.module;
  return requirePermission(page, action)(req, _res, next);
};
