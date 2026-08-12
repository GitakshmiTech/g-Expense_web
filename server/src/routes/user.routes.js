import { Router } from 'express';
import { createUser, deleteUser, downloadSampleUsersExcel, exportUsersExcel, listUserDirectory, listUsers, updateOwnPassword, updateUser, uploadUsersExcel } from '../controllers/user.controller.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });
import { authenticate, requireRoles } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/permission.middleware.js';
import { enforceTenant } from '../middleware/tenant.middleware.js';

const requireEmployeeEditOrSelf = (req, res, next) => {
  if (req.params.id === req.user._id.toString()) return next();
  return requirePermission('employees', 'edit')(req, res, next);
};

export const userRoutes = Router();

userRoutes.use(authenticate, enforceTenant);
userRoutes.get('/directory', requireRoles('company_admin', 'manager', 'finance', 'super_admin', 'employee', 'cfo'), listUserDirectory);
userRoutes.get('/sample-excel', requireRoles('company_admin', 'super_admin', 'manager', 'finance', 'employee', 'cfo'), downloadSampleUsersExcel);
userRoutes.get('/export-excel', requireRoles('company_admin', 'super_admin', 'manager', 'finance', 'employee', 'cfo'), exportUsersExcel);
userRoutes.get('/', requireRoles('company_admin', 'manager', 'finance', 'super_admin', 'employee', 'cfo'), requirePermission('employees', 'view'), listUsers);
userRoutes.post('/upload', requireRoles('company_admin', 'super_admin'), requirePermission('employees', 'create'), upload.single('file'), uploadUsersExcel);
userRoutes.post('/', requireRoles('company_admin', 'super_admin'), requirePermission('employees', 'create'), createUser);
userRoutes.post('/me/password', updateOwnPassword);
userRoutes.patch('/:id', requireEmployeeEditOrSelf, updateUser);
userRoutes.delete('/:id', requireRoles('company_admin', 'super_admin'), requirePermission('employees', 'edit'), deleteUser);
