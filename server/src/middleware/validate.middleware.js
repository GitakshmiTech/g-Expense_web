import { ApiError } from '../helpers/apiError.js';

export const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    return next(new ApiError(422, 'Validation failed', error.details.map((item) => item.message)));
  }
  req.body = value;
  next();
};
