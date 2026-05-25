import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const signAccessToken = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      companyId: user.companyId?.toString(),
      role: user.role,
      permissions: user.permissions || []
    },
    env.jwtSecret,
    { expiresIn: '15m' }
  );

export const signRefreshToken = (user, sessionId) =>
  jwt.sign({ sub: user._id.toString(), sessionId }, env.jwtRefreshSecret, { expiresIn: '7d' });
