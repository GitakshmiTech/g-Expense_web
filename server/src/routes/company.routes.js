import { Router } from 'express';
import { createCompany, listCompanies, updateCompany } from '../controllers/company.controller.js';
import { authenticate, requireRoles } from '../middleware/auth.middleware.js';

export const companyRoutes = Router();

companyRoutes.use(authenticate, requireRoles('super_admin'));
companyRoutes.get('/', listCompanies);
companyRoutes.post('/', createCompany);
companyRoutes.patch('/:id', updateCompany);
