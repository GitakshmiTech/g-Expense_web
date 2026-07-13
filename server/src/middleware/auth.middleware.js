import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../helpers/apiError.js';
import { User } from '../models/User.js';

export const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new ApiError(401, 'Authentication required');
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.sub).select('-password');
    if (!user || user.status !== 'active') throw new ApiError(401, 'Invalid session');
    req.user = user;
    req.companyId = user.companyId;
    next();
  } catch (error) {
    next(error.statusCode ? error : new ApiError(401, 'Invalid or expired token'));
  }
};

export const requireRoles = (...roles) => (req, res, next) => {
  if (req.user.role === 'super_admin') return next();
  if (!roles.includes(req.user.role)) return next(new ApiError(403, 'Insufficient role'));
  next();
};

export const requirePermission = (permission) => (req, res, next) => {
  if (req.user.role === 'super_admin' || req.user.permissions?.includes(permission)) return next();
  return next(new ApiError(403, `Missing permission: ${permission}`));
};
