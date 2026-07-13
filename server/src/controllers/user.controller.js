import { asyncHandler } from '../helpers/asyncHandler.js';
import { ApiError } from '../helpers/apiError.js';
import { tenantFilter } from '../middleware/tenant.middleware.js';
import { User } from '../models/User.js';
import { writeAudit } from '../audit/audit.service.js';
import { invalidatePermissionCache } from '../services/permission.service.js';

export const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find(tenantFilter(req)).select('-password').sort({ createdAt: -1 });
  res.json(users);
});

export const listUserDirectory = asyncHandler(async (req, res) => {
  const users = await User.find({ ...tenantFilter(req), status: 'active' })
    .select('_id name email department role status')
    .sort({ name: 1 });
  res.json(users);
});

export const createUser = asyncHandler(async (req, res) => {
  const user = await User.create({ ...req.body, companyId: req.companyId || req.body.companyId });
  await writeAudit({ req, action: 'user.create', entity: 'User', entityId: user._id.toString(), after: user.toObject() });
  res.status(201).json(user);
});

export const updateUser = asyncHandler(async (req, res) => {
  const isSelf = req.params.id === req.user._id.toString();
  const isAdmin = ['company_admin', 'super_admin'].includes(req.user.role);
  if (!isSelf && !isAdmin) {
    res.status(403);
    throw new Error('Forbidden: You can only update your own profile');
  }

  const updateData = { ...req.body };
  const requestedPassword = updateData.newPassword || updateData.password;
  const isPasswordChange = Boolean(updateData.passwordChange || requestedPassword);

  delete updateData.passwordChange;
  delete updateData.currentPassword;
  delete updateData.newPassword;
  delete updateData.confirmPassword;
  delete updateData.password;

  if (!isAdmin) {
    delete updateData.role;
    delete updateData.permissions;
    delete updateData.companyId;
    delete updateData.status;
  }

  const before = await User.findOne({ _id: req.params.id, ...tenantFilter(req) });
  if (!before) throw new ApiError(404, 'User not found');

  if (isPasswordChange) {
    if (!isSelf) throw new ApiError(403, 'You can only change your own password');
    if (!req.body.currentPassword) throw new ApiError(400, 'Current password is required');
    if (String(requestedPassword || '').length < 6) throw new ApiError(400, 'New password must be at least 6 characters');

    const userWithPassword = await User.findOne({ _id: req.params.id, ...tenantFilter(req) }).select('+password');
    if (!userWithPassword || !(await userWithPassword.comparePassword(req.body.currentPassword))) {
      throw new ApiError(400, 'Current password is incorrect');
    }
    Object.assign(userWithPassword, updateData);
    userWithPassword.password = requestedPassword;
    userWithPassword.updatedBy = req.user._id;
    await userWithPassword.save();
    const user = await User.findById(userWithPassword._id).select('-password');
    invalidatePermissionCache(req.companyId, user?._id);
    await writeAudit({ req, action: 'user.password_change', entity: 'User', entityId: req.params.id, before, after: user });
    return res.json({ ...user.toObject(), passwordChanged: true, message: 'Password changed successfully' });
  }

  const user = await User.findOneAndUpdate({ _id: req.params.id, ...tenantFilter(req) }, updateData, { new: true }).select('-password');
  invalidatePermissionCache(req.companyId, user?._id);
  await writeAudit({ req, action: 'user.update', entity: 'User', entityId: req.params.id, before, after: user });
  res.json(user);
});

export const updateOwnPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw new ApiError(400, 'Current password and new password are required');
  if (String(newPassword).length < 6) throw new ApiError(400, 'New password must be at least 6 characters');

  const user = await User.findOne({ _id: req.user._id, ...tenantFilter(req) }).select('+password');
  if (!user || !(await user.comparePassword(currentPassword))) throw new ApiError(400, 'Current password is incorrect');

  user.password = newPassword;
  await user.save();
  await writeAudit({ req, action: 'user.password_change', entity: 'User', entityId: user._id.toString() });
  res.json({ message: 'Password changed successfully' });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const isAdmin = ['company_admin', 'super_admin'].includes(req.user.role);
  if (!isAdmin) {
    res.status(403);
    throw new Error('Forbidden: Only admins can delete employees');
  }

  const before = await User.findOne({ _id: req.params.id, ...tenantFilter(req) });
  if (!before) throw new ApiError(404, 'User not found');

  await User.deleteOne({ _id: req.params.id, ...tenantFilter(req) });
  invalidatePermissionCache(req.companyId, req.params.id);
  await writeAudit({ req, action: 'user.delete', entity: 'User', entityId: req.params.id, before });
  res.json({ message: 'User deleted successfully' });
});
