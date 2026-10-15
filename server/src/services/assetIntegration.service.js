import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { ApiError } from '../helpers/apiError.js';
import { Expense } from '../models/Expense.js';
import { Budget } from '../models/Budget.js';
import { User } from '../models/User.js';
import { IntegrationVendor } from '../models/IntegrationVendor.js';
import { findActiveExpenseCategory } from './category.service.js';
import { consumeBudgetForExpense } from './budget.service.js';

const toObjectId = (value) => (value && mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : null);

const normalizeCategory = (value = '') => {
  const raw = String(value || '').trim().toLowerCase();
  if (raw.includes('software') || raw.includes('license')) return 'Software';
  if (raw.includes('office') || raw.includes('furniture') || raw.includes('chair') || raw.includes('desk')) return 'Office Supplies';
  if (raw.includes('repair') || raw.includes('maintenance')) return 'Office Supplies';
  if (raw.includes('depreciation')) return 'Office Supplies';
  return 'Software';
};

const resolveCompanyId = async ({ companyId, employee }) => {
  const explicit = toObjectId(companyId) || toObjectId(env.integration.defaultCompanyId);
  if (explicit) return explicit;
  if (employee?.companyId) return employee.companyId;
  const fallbackUser = await User.findOne({ role: { $in: ['finance', 'company_admin', 'cfo'] }, status: 'active', companyId: { $exists: true } }).sort({ createdAt: 1 });
  return fallbackUser?.companyId || null;
};

const resolveEmployee = async ({ employeeEmail, companyId }) => {
  const email = String(employeeEmail || env.integration.defaultUserEmail || '').trim().toLowerCase();
  if (email) {
    const byEmail = await User.findOne({ email, status: 'active' });
    if (byEmail) return byEmail;
  }

  const companyFilter = companyId ? { companyId } : {};
  return User.findOne({
    ...companyFilter,
    status: 'active',
    role: { $in: ['finance', 'company_admin', 'cfo', 'employee'] }
  }).sort({ role: 1, createdAt: 1 });
};

const resolveCategoryName = async ({ companyId, requestedCategory, actorId }) => {
  const fallback = normalizeCategory(requestedCategory);
  if (!companyId) return fallback;

  const requested = requestedCategory
    ? await findActiveExpenseCategory({ companyId, category: requestedCategory, actorId })
    : null;
  if (requested) return requested.name;

  const fallbackDoc = await findActiveExpenseCategory({ companyId, category: fallback, actorId });
  return fallbackDoc?.name || fallback;
};

export const upsertAssetOriginExpense = async (payload = {}) => {
  const sourceSystem = String(payload.sourceSystem || 'asset-management');
  const sourceType = String(payload.sourceType || '').trim();
  const sourceId = String(payload.sourceId || '').trim();
  if (!sourceType || !sourceId) throw new ApiError(400, 'sourceType and sourceId are required');

  const existing = await Expense.findOne({
    'customFields.sourceSystem': sourceSystem,
    'customFields.sourceType': sourceType,
    'customFields.sourceId': sourceId
  });
  if (existing) return { expense: existing, created: false };

  const preResolvedEmployee = await resolveEmployee({ employeeEmail: payload.employeeEmail, companyId: payload.companyId });
  const companyId = await resolveCompanyId({ companyId: payload.companyId, employee: preResolvedEmployee });
  const employee = preResolvedEmployee || await resolveEmployee({ employeeEmail: payload.employeeEmail, companyId });
  if (!employee) throw new ApiError(404, 'No active expense user found for integration posting');

  const amount = Number(payload.amount || payload.totalAmount || 0);
  if (!(amount > 0)) throw new ApiError(400, 'Expense amount must be greater than zero');

  const category = await resolveCategoryName({
    companyId,
    requestedCategory: payload.category,
    actorId: employee._id
  });

  const status = payload.status || (sourceType === 'maintenance_reimbursement' ? 'manager_review' : 'approved');
  const expense = await Expense.create({
    companyId,
    employeeId: employee._id,
    createdBy: employee._id,
    category,
    merchant: payload.merchant || payload.vendorName || 'Asset Management',
    expenseDate: payload.expenseDate ? new Date(payload.expenseDate) : new Date(),
    amount,
    currency: payload.currency || 'INR',
    convertedAmount: Number(payload.convertedAmount || amount),
    baseCurrency: payload.currency || 'INR',
    taxAmount: Number(payload.taxAmount || 0),
    invoiceNumber: payload.invoiceNumber || '',
    paymentMode: payload.paymentMode || 'bank',
    description: payload.description || `${sourceType} from Asset Management`,
    status,
    approvalPath: Array.isArray(payload.approvalPath) ? payload.approvalPath : [],
    customFields: {
      ...(payload.metadata || {}),
      sourceSystem,
      sourceType,
      sourceId,
      assetId: payload.assetId,
      assetName: payload.assetName,
      poNumber: payload.poNumber,
      workOrderId: payload.workOrderId,
      depreciationPeriod: payload.depreciationPeriod
    },
    timeline: [
      {
        status,
        action: 'asset_integration_created',
        actorId: employee._id,
        note: `Created from ${sourceSystem} ${sourceType}`
      }
    ]
  });

  if (payload.consumeBudget !== false && companyId) {
    await consumeBudgetForExpense({ companyId, expense, employee });
  }

  return { expense, created: true };
};

export const checkBudgetForAssetPurchase = async (payload = {}) => {
  const companyId = toObjectId(payload.companyId) || toObjectId(env.integration.defaultCompanyId);
  const amount = Number(payload.amount || 0);
  if (!(amount >= 0)) throw new ApiError(400, 'amount must be a number');

  if (!companyId) {
    return {
      allowed: true,
      budgetFound: false,
      amount,
      remaining: null,
      message: 'No company mapping found for budget check; purchase is allowed with warning.'
    };
  }

  const when = payload.date ? new Date(payload.date) : new Date();
  const filter = {
    companyId,
    status: 'active',
    'period.start': { $lte: when },
    'period.end': { $gte: when }
  };

  const or = [];
  if (payload.department) or.push({ type: 'department', department: payload.department });
  if (payload.projectCode) or.push({ type: 'project', projectCode: payload.projectCode });
  if (or.length) filter.$or = or;

  const budget = await Budget.findOne(filter).sort({ type: 1, createdAt: 1 });
  if (!budget) {
    return { allowed: true, budgetFound: false, amount, remaining: null, message: 'No active budget found; purchase is allowed with warning.' };
  }

  const consumed = Number(budget.consumed || 0);
  const total = Number(budget.amount || 0);
  const remaining = Math.max(0, total - consumed);
  const allowed = amount <= remaining;

  return {
    allowed,
    budgetFound: true,
    budgetId: budget._id,
    budgetName: budget.name,
    amount,
    total,
    consumed,
    remaining,
    projectedConsumed: consumed + amount,
    message: allowed ? 'Budget available for asset purchase.' : 'Asset purchase exceeds remaining budget.'
  };
};

export const syncAssetVendor = async (payload = {}) => {
  const name = String(payload.name || payload.orgName || '').trim();
  if (!name) throw new ApiError(400, 'Vendor name is required');
  const companyId = toObjectId(payload.companyId) || toObjectId(env.integration.defaultCompanyId);
  const sourceSystem = String(payload.sourceSystem || 'asset-management');
  const sourceId = String(payload.sourceId || payload.id || name).trim();

  const vendor = await IntegrationVendor.findOneAndUpdate(
    { companyId, sourceSystem, sourceId },
    {
      $set: {
        companyId,
        sourceSystem,
        sourceId,
        name,
        contactPerson: payload.contactPerson || '',
        email: payload.email || '',
        phone: payload.phone || '',
        gstNumber: payload.gstNumber || '',
        category: payload.category || 'asset_supplier',
        metadata: payload.metadata || {},
        active: payload.active !== false
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return vendor;
};

export const listIntegrationVendors = async ({ companyId, search } = {}) => {
  const filter = { active: true };
  const resolvedCompanyId = toObjectId(companyId) || toObjectId(env.integration.defaultCompanyId);
  if (resolvedCompanyId) filter.$or = [{ companyId: resolvedCompanyId }, { companyId: null }];
  if (search) filter.name = { $regex: String(search), $options: 'i' };
  return IntegrationVendor.find(filter).sort({ name: 1 }).limit(100);
};

export const requestAssetAssignmentsForTravel = async ({ trip }) => {
  const selectedAssets = Array.isArray(trip?.assetRequests) ? trip.assetRequests : [];
  if (!selectedAssets.length) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(`${String(env.integration.assetApiBaseUrl).replace(/\/+$/, '')}/integrations/expense/travel-assignments`, {
      signal: controller.signal,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-integration-token': env.integration.serviceToken,
        'x-source-system': 'expense-management'
      },
      body: JSON.stringify({
        travelId: trip.travelId,
        travelRequestId: trip._id,
        employeeName: trip.employeeId?.name,
        employeeEmail: trip.employeeId?.email,
        employeeId: String(trip.employeeId?._id || trip.employeeId || ''),
        department: trip.department || trip.employeeId?.department,
        startDate: trip.startDate,
        endDate: trip.endDate,
        expectedReturn: trip.endDate,
        destination: trip.destination,
        purpose: trip.purpose,
        assets: selectedAssets
      })
    }).finally(() => clearTimeout(timeout));

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.warn('[AssetIntegration] Asset assignment failed:', data.message);
      return null;
    }
    return data;
  } catch (error) {
    console.warn('[AssetIntegration] Asset assignment service unreachable:', error.message);
    return null;
  }
};

export const listAvailableTravelAssets = async ({ search, category } = {}) => {
  try {
    const baseUrl = String(env.integration.assetApiBaseUrl || '').replace(/\/+$/, '');
    if (!baseUrl) return [];

    const url = new URL(`${baseUrl}/integrations/expense/available-assets`);
    if (search) url.searchParams.set('search', search);
    if (category) url.searchParams.set('category', category);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'x-integration-token': env.integration.serviceToken,
        'x-source-system': 'expense-management'
      }
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      console.warn(`[AssetIntegration] Available assets returned status ${response.status}`);
      return [];
    }
    const data = await response.json().catch(() => ({}));
    return data.assets || [];
  } catch (error) {
    console.warn(`[AssetIntegration] External asset service is offline or unreachable (${error.message}). Continuing with empty asset list.`);
    return [];
  }
};
