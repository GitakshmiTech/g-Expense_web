import mongoose from 'mongoose';
import { EmployeePermission, PageRegistry, RbacPermission, RbacRole } from '../models/Rbac.js';
import { COMPANY_ADMIN_PAGES, DEFAULT_ROLE_GRANTS } from '../rbac/companyAdmin.pages.js';

const cache = new Map();
const CACHE_TTL_MS = 60_000;

const permissionKey = (page, action) => `${page}:${action}`;

const normalizeGrant = (grant) => ({
  page: String(grant.page || '').trim(),
  action: String(grant.action || '').trim(),
  allowed: grant.allowed !== false
});

const grantsToMap = (grants = []) => {
  const map = new Map();
  grants.map(normalizeGrant).filter((grant) => grant.page && grant.action).forEach((grant) => {
    map.set(permissionKey(grant.page, grant.action), grant.allowed);
  });
  return map;
};

const mapToMatrix = (map) => {
  const matrix = {};
  for (const [key, allowed] of map.entries()) {
    if (!allowed) continue;
    const [page, action] = key.split(':');
    matrix[page] ||= {};
    matrix[page][action] = true;
  }
  return matrix;
};

export const invalidatePermissionCache = (companyId, userId) => {
  if (!companyId) return cache.clear();
  const prefix = `${companyId}:`;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix) && (!userId || key === `${companyId}:${userId}`)) cache.delete(key);
  }
};

export const syncCompanyPageRegistry = async (companyId, actorId) => {
  if (!companyId) return;
  const companyObjectId = new mongoose.Types.ObjectId(companyId);
  await Promise.all(
    COMPANY_ADMIN_PAGES.map(async (page) => {
      await PageRegistry.updateOne(
        { companyId: companyObjectId, key: page.key, deletedAt: null },
        {
          $set: {
            label: page.label,
            path: page.path,
            actions: page.actions,
            order: page.order,
            panel: 'company_admin',
            isSystem: true,
            isActive: true,
            updatedBy: actorId
          },
          $setOnInsert: { companyId: companyObjectId, key: page.key, createdBy: actorId }
        },
        { upsert: true }
      );

      await Promise.all(
        page.actions.map((action) =>
          RbacPermission.updateOne(
            { companyId: companyObjectId, key: permissionKey(page.key, action), deletedAt: null },
            {
              $set: {
                page: page.key,
                action,
                label: `${page.label} ${action}`,
                description: `Allows ${action} access on ${page.label}.`,
                isSystem: true,
                isActive: true,
                updatedBy: actorId
              },
              $setOnInsert: { companyId: companyObjectId, key: permissionKey(page.key, action), createdBy: actorId }
            },
            { upsert: true }
          )
        )
      );
    })
  );
};

export const ensureSystemRole = async (companyId, roleCode, actorId) => {
  const grants = DEFAULT_ROLE_GRANTS[roleCode];
  if (!companyId || !grants) return null;
  return RbacRole.findOneAndUpdate(
    { companyId, code: roleCode, deletedAt: null },
    {
      $setOnInsert: {
        companyId,
        code: roleCode,
        name: roleCode.split('_').map((word) => word[0].toUpperCase() + word.slice(1)).join(' '),
        description: `System ${roleCode} baseline permissions.`,
        permissions: grants,
        isSystem: true,
        isActive: true,
        createdBy: actorId
      },
      $set: { updatedBy: actorId }
    },
    { new: true, upsert: true }
  );
};

const collectInheritedRoles = async (roleIds, companyId) => {
  const visited = new Set();
  const ordered = [];
  const stack = [...roleIds.filter(Boolean).map(String)];

  while (stack.length) {
    const id = stack.shift();
    if (visited.has(id)) continue;
    visited.add(id);

    const role = await RbacRole.findOne({ _id: id, companyId, isActive: true, deletedAt: null }).lean();
    if (!role) continue;
    if (role.parentRoleId) stack.push(String(role.parentRoleId));
    ordered.push(role);
  }

  return ordered.sort((a, b) => (a.hierarchyLevel || 0) - (b.hierarchyLevel || 0));
};

export const getEffectiveAccess = async (user, { fresh = false } = {}) => {
  if (!user) return { permissions: {}, pages: [], source: 'anonymous' };
  if (user.role === 'super_admin') return { permissions: {}, pages: [], source: 'super_admin' };
  if (!user.companyId) return { permissions: {}, pages: [], source: 'missing_company' };

  await syncCompanyPageRegistry(user.companyId, user._id);
  await ensureSystemRole(user.companyId, user.role, user._id);

  const cacheKey = `${user.companyId}:${user._id}`;
  const cached = cache.get(cacheKey);
  if (!fresh && cached && cached.expiresAt > Date.now()) return cached.value;

  const pages = await PageRegistry.find({ companyId: user.companyId, panel: 'company_admin', isActive: true, deletedAt: null }).sort({ order: 1 }).lean();
  const employeeAccess = await EmployeePermission.findOne({ companyId: user.companyId, employeeId: user._id, isActive: true, deletedAt: null }).lean();
  const baseRole = await RbacRole.findOne({ companyId: user.companyId, code: user.role, isActive: true, deletedAt: null }).lean();
  const roles = await collectInheritedRoles([baseRole?._id, ...(employeeAccess?.roleIds || [])], user.companyId);

  const merged = new Map();
  roles.forEach((role) => {
    for (const [key, allowed] of grantsToMap(role.permissions)) merged.set(key, allowed);
  });
  for (const [key, allowed] of grantsToMap((user.permissions || []).map((item) => {
    const [page, action] = String(item).split(':');
    return { page, action, allowed: true };
  }))) merged.set(key, allowed);
  for (const [key, allowed] of grantsToMap(employeeAccess?.permissions || [])) merged.set(key, allowed);
  for (const [key] of grantsToMap(employeeAccess?.deniedPermissions || [])) merged.set(key, false);

  const matrix = mapToMatrix(merged);
  const accessiblePages = pages.filter((page) => matrix[page.key]?.view || matrix[page.key]?.manage);
  const value = {
    permissions: matrix,
    pages: accessiblePages,
    roleIds: roles.map((role) => role._id),
    source: 'company_admin_rbac'
  };
  cache.set(cacheKey, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
};

export const hasPermission = async (user, page, action = 'view') => {
  if (user?.role === 'super_admin' || user?.role === 'company_admin') return true;
  const effective = await getEffectiveAccess(user);
  return Boolean(effective.permissions?.[page]?.manage || effective.permissions?.[page]?.[action]);
};

export const assertEmployeeInCompany = (employee, companyId) => employee && String(employee.companyId) === String(companyId);
