import { asyncHandler } from '../helpers/asyncHandler.js';
import {
  checkBudgetForAssetPurchase,
  listIntegrationVendors,
  syncAssetVendor,
  upsertAssetOriginExpense
} from '../services/assetIntegration.service.js';

export const createAssetOriginExpense = asyncHandler(async (req, res) => {
  const result = await upsertAssetOriginExpense(req.body);
  res.status(result.created ? 201 : 200).json({
    success: true,
    created: result.created,
    expense: result.expense
  });
});

export const checkAssetPurchaseBudget = asyncHandler(async (req, res) => {
  const result = await checkBudgetForAssetPurchase(req.body);
  res.status(result.allowed ? 200 : 409).json({
    success: result.allowed,
    ...result
  });
});

export const upsertVendorFromAsset = asyncHandler(async (req, res) => {
  const vendor = await syncAssetVendor(req.body);
  res.json({ success: true, vendor });
});

export const vendorsForIntegrations = asyncHandler(async (req, res) => {
  const vendors = await listIntegrationVendors(req.query);
  res.json({ success: true, vendors });
});

export const vendorsForCurrentUser = asyncHandler(async (req, res) => {
  const vendors = await listIntegrationVendors({
    companyId: req.companyId,
    search: req.query.search
  });
  res.json({ success: true, vendors });
});
