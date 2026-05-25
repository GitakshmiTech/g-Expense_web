import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { forgotPasswordSchema, loginSchema, resetPasswordSchema } from '../validators/auth.validator.js';
import { forgotPassword, login, logout, refresh, requestOtp, resetPassword, sessions } from '../controllers/auth.controller.js';

export const authRoutes = Router();

authRoutes.post('/login', validate(loginSchema), login);
authRoutes.post('/refresh', refresh);
authRoutes.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
authRoutes.post('/reset-password', validate(resetPasswordSchema), resetPassword);
authRoutes.post('/otp', requestOtp);
authRoutes.post('/logout', authenticate, logout);
authRoutes.get('/sessions', authenticate, sessions);
