import { Router } from 'express';
import {
  createRole,
  deleteRole,
  getEmployeeAccess,
  getMyAccess,
  listEmployeeAccess,
  listPages,
  listPermissions,
  listRoles,
  updateRole,
  upsertEmployeeAccess
} from '../controllers/rbac.controller.js';
import { authenticate, requireRoles } from '../middleware/auth.middleware.js';
import { enforceTenant } from '../middleware/tenant.middleware.js';
import { requirePermission } from '../middleware/permission.middleware.js';

export const rbacRoutes = Router();

rbacRoutes.use(authenticate, enforceTenant);
rbacRoutes.get('/me', getMyAccess);
rbacRoutes.get('/pages', requirePermission('roles_permissions', 'view'), listPages);
rbacRoutes.get('/permissions', requirePermission('roles_permissions', 'view'), listPermissions);
rbacRoutes.get('/roles', requirePermission('roles_permissions', 'view'), listRoles);
rbacRoutes.post('/roles', requireRoles('company_admin'), requirePermission('roles_permissions', 'create'), createRole);
rbacRoutes.patch('/roles/:id', requireRoles('company_admin'), requirePermission('roles_permissions', 'edit'), updateRole);
rbacRoutes.delete('/roles/:id', requireRoles('company_admin'), requirePermission('roles_permissions', 'delete'), deleteRole);
rbacRoutes.get('/employee-access', requirePermission('roles_permissions', 'view'), listEmployeeAccess);
rbacRoutes.get('/employee-access/:employeeId', requirePermission('roles_permissions', 'view'), getEmployeeAccess);
rbacRoutes.put('/employee-access/:employeeId', requireRoles('company_admin'), requirePermission('roles_permissions', 'manage'), upsertEmployeeAccess);
