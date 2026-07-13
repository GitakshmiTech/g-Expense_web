import { Router } from 'express';
import {
  checkAssetPurchaseBudget,
  createAssetOriginExpense,
  upsertVendorFromAsset,
  vendorsForCurrentUser,
  vendorsForIntegrations
} from '../controllers/assetIntegration.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authenticateIntegration } from '../middleware/integration.middleware.js';

export const integrationRoutes = Router();

integrationRoutes.get('/vendors/live', authenticate, vendorsForCurrentUser);

integrationRoutes.use(authenticateIntegration);

integrationRoutes.post('/assets/expenses', createAssetOriginExpense);
integrationRoutes.post('/assets/budget-check', checkAssetPurchaseBudget);
integrationRoutes.post('/assets/vendors', upsertVendorFromAsset);
integrationRoutes.get('/vendors', vendorsForIntegrations);
