import { writeAudit } from '../audit/audit.service.js';
import { ApiError } from '../helpers/apiError.js';
import { asyncHandler } from '../helpers/asyncHandler.js';
import { EmployeePermission, PageRegistry, RbacPermission, RbacRole } from '../models/Rbac.js';
import { User } from '../models/User.js';
import { assertEmployeeInCompany, getEffectiveAccess, invalidatePermissionCache, syncCompanyPageRegistry } from '../services/permission.service.js';

const cleanGrant = (grant) => ({
  page: String(grant.page || '').trim(),
  action: String(grant.action || '').trim(),
  allowed: grant.allowed !== false
});

const cleanGrants = (grants = []) => grants.map(cleanGrant).filter((grant) => grant.page && grant.action);

export const getMyAccess = asyncHandler(async (req, res) => {
  res.json(await getEffectiveAccess(req.user, { fresh: req.query.fresh === 'true' }));
});

export const listPages = asyncHandler(async (req, res) => {
  await syncCompanyPageRegistry(req.companyId, req.user._id);
  const pages = await PageRegistry.find({ companyId: req.companyId, isActive: true, deletedAt: null }).sort({ order: 1 });
  res.json(pages);
});

export const listPermissions = asyncHandler(async (req, res) => {
  await syncCompanyPageRegistry(req.companyId, req.user._id);
  const permissions = await RbacPermission.find({ companyId: req.companyId, isActive: true, deletedAt: null }).sort({ page: 1, action: 1 });
  res.json(permissions);
});

export const listRoles = asyncHandler(async (req, res) => {
  const roles = await RbacRole.find({ companyId: req.companyId, deletedAt: null }).sort({ hierarchyLevel: 1, name: 1 });
  res.json(roles);
});

export const createRole = asyncHandler(async (req, res) => {
  const role = await RbacRole.create({
    companyId: req.companyId,
    name: req.body.name,
    code: req.body.code,
    description: req.body.description,
    parentRoleId: req.body.parentRoleId || null,
    hierarchyLevel: Number(req.body.hierarchyLevel || 0),
    permissions: cleanGrants(req.body.permissions),
    createdBy: req.user._id,
    updatedBy: req.user._id
  });
  invalidatePermissionCache(req.companyId);
  await writeAudit({ req, action: 'rbac.role.create', entity: 'RbacRole', entityId: role._id.toString(), after: role.toObject() });
  res.status(201).json(role);
});

export const updateRole = asyncHandler(async (req, res) => {
  const update = {
    name: req.body.name,
    description: req.body.description,
    parentRoleId: req.body.parentRoleId || null,
    hierarchyLevel: Number(req.body.hierarchyLevel || 0),
    permissions: cleanGrants(req.body.permissions),
    updatedBy: req.user._id
  };
  if (req.body.code) update.code = req.body.code;
  const before = await RbacRole.findOne({ _id: req.params.id, companyId: req.companyId, deletedAt: null });
  const role = await RbacRole.findOneAndUpdate({ _id: req.params.id, companyId: req.companyId, deletedAt: null }, update, { new: true });
  if (!role) throw new ApiError(404, 'Role not found');
  invalidatePermissionCache(req.companyId);
  await writeAudit({ req, action: 'rbac.role.update', entity: 'RbacRole', entityId: role._id.toString(), before, after: role.toObject() });
  res.json(role);
});

export const deleteRole = asyncHandler(async (req, res) => {
  const role = await RbacRole.findOneAndUpdate(
    { _id: req.params.id, companyId: req.companyId, deletedAt: null, isSystem: { $ne: true } },
    { deletedAt: new Date(), isActive: false, updatedBy: req.user._id },
    { new: true }
  );
  if (!role) throw new ApiError(404, 'Custom role not found or cannot be deleted');
  invalidatePermissionCache(req.companyId);
  await writeAudit({ req, action: 'rbac.role.delete', entity: 'RbacRole', entityId: role._id.toString(), before: role.toObject() });
  res.status(204).end();
});

export const listEmployeeAccess = asyncHandler(async (req, res) => {
  const [employees, access] = await Promise.all([
    User.find({ companyId: req.companyId }).select('-password').sort({ name: 1 }),
    EmployeePermission.find({ companyId: req.companyId, deletedAt: null })
  ]);
  res.json({ employees, access });
});

export const getEmployeeAccess = asyncHandler(async (req, res) => {
  const employee = await User.findOne({ _id: req.params.employeeId, companyId: req.companyId }).select('-password');
  if (!employee) throw new ApiError(404, 'Employee not found');
  const assignment = await EmployeePermission.findOne({ companyId: req.companyId, employeeId: employee._id, deletedAt: null });
  const effective = await getEffectiveAccess(employee, { fresh: true });
  res.json({ employee, assignment, effective });
});

export const upsertEmployeeAccess = asyncHandler(async (req, res) => {
  const employee = await User.findOne({ _id: req.params.employeeId, companyId: req.companyId });
  if (!assertEmployeeInCompany(employee, req.companyId)) throw new ApiError(404, 'Employee not found in this company');
  const assignment = await EmployeePermission.findOneAndUpdate(
    { companyId: req.companyId, employeeId: employee._id, deletedAt: null },
    {
      $set: {
        companyId: req.companyId,
        employeeId: employee._id,
        roleIds: req.body.roleIds || [],
        permissions: cleanGrants(req.body.permissions),
        deniedPermissions: cleanGrants(req.body.deniedPermissions),
        isActive: req.body.isActive !== false,
        updatedBy: req.user._id
      },
      $setOnInsert: { createdBy: req.user._id }
    },
    { new: true, upsert: true }
  );
  invalidatePermissionCache(req.companyId, employee._id);
  await writeAudit({ req, action: 'rbac.employee_access.upsert', entity: 'EmployeePermission', entityId: assignment._id.toString(), after: assignment.toObject() });
  res.json({ assignment, effective: await getEffectiveAccess(employee, { fresh: true }) });
});
