import { asyncHandler } from '../helpers/asyncHandler.js';
import { tenantFilter } from '../middleware/tenant.middleware.js';
import { User } from '../models/User.js';
import { writeAudit } from '../audit/audit.service.js';

export const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find(tenantFilter(req)).select('-password').sort({ createdAt: -1 });
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
  if (!isAdmin) {
    delete updateData.role;
    delete updateData.permissions;
    delete updateData.companyId;
    delete updateData.status;
  }

  const before = await User.findOne({ _id: req.params.id, ...tenantFilter(req) });
  const user = await User.findOneAndUpdate({ _id: req.params.id, ...tenantFilter(req) }, updateData, { new: true }).select('-password');
  await writeAudit({ req, action: 'user.update', entity: 'User', entityId: req.params.id, before, after: user });
  res.json(user);
});
