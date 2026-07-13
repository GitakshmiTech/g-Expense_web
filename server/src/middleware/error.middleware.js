import { logger } from '../config/logger.js';

export const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

export const errorHandler = (error, req, res, next) => {
  let statusCode = error.statusCode || 500;
  let message = error.message;

  // Intercept MongoDB duplicate key errors (E11000)
  if (error.code === 11000) {
    statusCode = 400;
    const keys = Object.keys(error.keyValue || {});
    if (keys.includes('email')) {
      message = 'Email address is already in use.';
    } else if (keys.includes('employeeId')) {
      message = 'Employee Code is already in use.';
    } else {
      message = 'Duplicate key error: A record with this value already exists.';
    }
  }

  if (statusCode >= 500) logger.error(error.message, { stack: error.stack, details: error.details });
  else logger.warn(message, { details: error.details, path: req.originalUrl });
  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? 'Internal server error' : message,
    details: error.details || undefined
  });
};
