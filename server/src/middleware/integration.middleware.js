import { env } from '../config/env.js';
import { ApiError } from '../helpers/apiError.js';

export const authenticateIntegration = (req, res, next) => {
  const token =
    req.get('x-integration-token') ||
    req.get('x-service-token') ||
    req.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (!token || token !== env.integration.serviceToken) {
    return next(new ApiError(401, 'Invalid integration token'));
  }

  req.integration = { source: req.get('x-source-system') || 'asset-management' };
  next();
};
