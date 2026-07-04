import { Router } from 'express';
import { createCompany, listCompanies, updateCompany } from '../controllers/company.controller.js';
import { authenticate, requireRoles } from '../middleware/auth.middleware.js';

export const companyRoutes = Router();

companyRoutes.use(authenticate);
companyRoutes.get('/', requireRoles('super_admin', 'company_admin'), listCompanies);
companyRoutes.post('/', requireRoles('super_admin'), createCompany);
companyRoutes.patch('/:id', requireRoles('super_admin', 'company_admin'), updateCompany);
