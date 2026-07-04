import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { env } from '../config/env.js';
import { ApiError } from '../helpers/apiError.js';
import { asyncHandler } from '../helpers/asyncHandler.js';
import { signAccessToken, signRefreshToken } from '../helpers/tokens.js';
import { writeAudit } from '../audit/audit.service.js';
import { sendEmail } from '../services/email.service.js';
import { User } from '../models/User.js';

const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');

export const login = asyncHandler(async (req, res) => {
  const { email, password, otp } = req.body;
  const user = await User.findOne({ 
    $or: [
      { email: email },
      { employeeId: email }
    ]
  }).select('+password +mfaSecret');
  console.log(`[LOGIN DEBUG] Attempt for email/id: "${email}", password length: ${password.length}`);
  if (!user) {
    console.log('[LOGIN DEBUG] User not found!');
    throw new ApiError(401, 'Invalid credentials');
  }
  const isMatch = await user.comparePassword(password);
  console.log(`[LOGIN DEBUG] Password match: ${isMatch}`);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid credentials');
  }
  if (user.mfaEnabled && user.otp?.purpose === 'login') {
    if (!otp || hash(otp) !== user.otp.codeHash || user.otp.expiresAt < new Date()) throw new ApiError(401, 'Valid OTP required');
  }
  const sessionId = uuid();
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user, sessionId);
  user.sessions.push({
    sessionId,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    refreshTokenHash: hash(refreshToken),
    lastSeenAt: new Date()
  });
  user.otp = undefined;
  await user.save();
  req.user = user;
  req.companyId = user.companyId;
  await writeAudit({ req, action: 'auth.login', entity: 'User', entityId: user._id.toString() });
  res.json({ accessToken, refreshToken, user: sanitizeUser(user) });
});

export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new ApiError(401, 'Refresh token required');
  try {
    const payload = jwt.verify(refreshToken, env.jwtRefreshSecret);
    const user = await User.findById(payload.sub);
    const session = user?.sessions.find((item) => item.sessionId === payload.sessionId && item.active);
    if (!user || !session || session.refreshTokenHash !== hash(refreshToken)) throw new ApiError(401, 'Invalid refresh token');
    session.lastSeenAt = new Date();
    await user.save();
    res.json({ accessToken: signAccessToken(user), user: sanitizeUser(user) });
  } catch (error) {
    if (error.statusCode) throw error;
    throw new ApiError(401, 'Invalid or expired session');
  }
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (user) {
    const token = crypto.randomBytes(24).toString('hex');
    user.passwordReset = { tokenHash: hash(token), expiresAt: new Date(Date.now() + 1000 * 60 * 20) };
    await user.save();
    await sendEmail({ to: user.email, subject: 'Reset your GT Expense password', html: `<p>Reset token: <b>${token}</b></p>` });
  }
  res.json({ message: 'If the account exists, reset instructions have been sent.' });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ 'passwordReset.tokenHash': hash(req.body.token), 'passwordReset.expiresAt': { $gt: new Date() } });
  if (!user) throw new ApiError(400, 'Invalid or expired reset token');
  user.password = req.body.password;
  user.passwordReset = undefined;
  user.sessions.forEach((session) => (session.active = false));
  await user.save();
  res.json({ message: 'Password reset complete' });
});

export const requestOtp = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) throw new ApiError(404, 'User not found');
  const code = String(Math.floor(100000 + Math.random() * 900000));
  user.otp = { codeHash: hash(code), expiresAt: new Date(Date.now() + 1000 * 60 * 5), purpose: req.body.purpose || 'login' };
  await user.save();
  await sendEmail({ to: user.email, subject: 'GT Expense OTP', html: `<p>Your OTP is <b>${code}</b>. It expires in 5 minutes.</p>` });
  res.json({ message: 'OTP sent' });
});

export const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    const tokenHash = hash(refreshToken);
    const user = await User.findById(req.user._id);
    user.sessions.forEach((session) => {
      if (session.refreshTokenHash === tokenHash) session.active = false;
    });
    await user.save();
  }
  res.json({ message: 'Logged out' });
});

export const sessions = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json(user.sessions.map(({ sessionId, ip, userAgent, active, lastSeenAt, createdAt }) => ({ sessionId, ip, userAgent, active, lastSeenAt, createdAt })));
});

const sanitizeUser = (user) => ({
  id: user._id,
  companyId: user.companyId,
  name: user.name,
  email: user.email,
  employeeId: user.employeeId,
  role: user.role,
  permissions: user.permissions,
  department: user.department,
  designation: user.designation,
  phone: user.phone,
  bankDetails: user.bankDetails
});
