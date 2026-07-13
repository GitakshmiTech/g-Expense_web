import { Router } from 'express';
import {
  createEnterpriseRecord,
  deleteEnterpriseRecord,
  listEnterpriseModules,
  listEnterpriseRecords,
  updateEnterpriseRecord
} from '../controllers/enterprise.controller.js';
import { authenticate, requireRoles } from '../middleware/auth.middleware.js';
import { requireEnterprisePermission } from '../middleware/permission.middleware.js';
import { enforceTenant } from '../middleware/tenant.middleware.js';

export const enterpriseRoutes = Router();

enterpriseRoutes.use(authenticate, enforceTenant);
enterpriseRoutes.get('/modules', listEnterpriseModules);
enterpriseRoutes.get('/:module', requireEnterprisePermission('view'), listEnterpriseRecords);
enterpriseRoutes.post('/:module', requireRoles('company_admin', 'finance', 'cfo', 'super_admin'), requireEnterprisePermission('create'), createEnterpriseRecord);
enterpriseRoutes.patch('/:module/:id', requireRoles('company_admin', 'finance', 'cfo', 'super_admin'), requireEnterprisePermission('edit'), updateEnterpriseRecord);
enterpriseRoutes.delete('/:module/:id', requireRoles('company_admin', 'super_admin'), requireEnterprisePermission('delete'), deleteEnterpriseRecord);
