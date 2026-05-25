import { logger } from '../config/logger.js';

export const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

export const errorHandler = (error, req, res, next) => {
  const statusCode = error.statusCode || 500;
  if (statusCode >= 500) logger.error(error.message, { stack: error.stack, details: error.details });
  else logger.warn(error.message, { details: error.details, path: req.originalUrl });
  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? 'Internal server error' : error.message,
    details: error.details || undefined
  });
};
