import { Router } from 'express';
import { asyncHandler } from '../helpers/asyncHandler.js';
import { ApiError } from '../helpers/apiError.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { enforceTenant } from '../middleware/tenant.middleware.js';
import { ExpenseCategory, Department } from '../models/Enterprise.js';
import { EnterprisePolicy } from '../models/EnterprisePolicy.js';
import { Expense } from '../models/Expense.js';
import { User } from '../models/User.js';
import { ensureExpenseCategoryCatalog } from '../services/category.service.js';

export const categoryRoutes = Router();

categoryRoutes.use(authenticate, enforceTenant);

/**
 * @route   GET /api/expense-categories/catalog
 * @desc    Active category catalog for employee expense submission.
 */
categoryRoutes.get(
  '/catalog',
  asyncHandler(async (req, res) => {
    const categories = await ensureExpenseCategoryCatalog({ companyId: req.companyId, actorId: req.user?._id });

    res.json(categories.map((category) => category.toObject ? category.toObject() : category));
  })
);

/**
 * @route   POST /api/expense-categories/simulate-impact
 * @desc    Simulate and calculate downstream impacts of modifying a category's policy/limits.
 */
categoryRoutes.post(
  '/simulate-impact',
  asyncHandler(async (req, res) => {
    const { categoryId, limits, compliance, accounting, dynamicFields } = req.body;
    const companyId = req.companyId;

    let targetCategory = null;
    if (categoryId) {
      targetCategory = await ExpenseCategory.findOne({ _id: categoryId, companyId });
    }

    const categoryCode = targetCategory?.code || req.body.categoryCode;
    const categoryName = targetCategory?.name || req.body.categoryName || categoryCode;
    if (!categoryCode) {
      throw new ApiError(400, 'Category identifier is required for simulation');
    }

    // 1. Scan policies impacted
    const policiesImpacted = await EnterprisePolicy.find({
      companyId,
      $or: [
        { 'compliance.blockedCategories': categoryCode },
        { code: { $regex: new RegExp(categoryCode, 'i') } }
      ]
    }).select('name code status').lean();

    // 2. Scan pending transactions affected (in validation or draft state)
    const pendingTransactions = await Expense.find({
      companyId,
      category: { $in: [categoryCode, categoryName] },
      status: { $in: ['DRAFT', 'VALIDATING', 'SENT_BACK', 'submitted', 'manager_review'] }
    }).select('_id amount employeeId').lean();

    // 3. Scan number of employees actively using this category
    const employeeCount = await User.countDocuments({
      companyId,
      status: 'active'
    });

    const activePolicyConflicts = policiesImpacted.map((policy) => ({
      policyId: policy._id,
      description: `Policy '${policy.name}' references category ${categoryCode}`,
      severity: 'WARNING'
    }));

    res.json({
      success: true,
      simulationResult: {
        categoryCode,
        status: activePolicyConflicts.length > 0 ? 'CONFLICTS_DETECTED' : 'STABLE_PROCEED_PERMITTED',
        impactMetrics: {
          employeesAffected: employeeCount,
          policiesLinked: policiesImpacted.length,
          pendingWorkflowsReRouted: pendingTransactions.length,
          validationConflicts: activePolicyConflicts
        }
      }
    });
  })
);

/**
 * @route   GET /api/expense-categories/:code/dynamic-fields
 * @desc    Fetch dynamic schema fields layout for rendering custom forms.
 */
categoryRoutes.get(
  '/:code/dynamic-fields',
  asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { code } = req.params;

    const category = await ExpenseCategory.findOne({
      companyId,
      $or: [{ code }, { name: code }]
    });

    if (!category) {
      throw new ApiError(404, 'Expense category not found');
    }

    res.json({
      success: true,
      categoryCode: category.code,
      schema: {
        fields: category.dynamicFields || []
      }
    });
  })
);

/**
 * @route   POST /api/expense-categories/validate-fields
 * @desc    Validate runtime inputs of dynamic custom fields.
 */
categoryRoutes.post(
  '/validate-fields',
  asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { categoryCode, customFields } = req.body;

    const category = await ExpenseCategory.findOne({
      companyId,
      $or: [{ code: categoryCode }, { name: categoryCode }]
    });

    if (!category) {
      throw new ApiError(404, 'Expense category not found');
    }

    const failures = [];
    const fields = category.dynamicFields || [];

    for (const field of fields) {
      const val = customFields?.[field.fieldId];
      if (field.isRequired && (val === undefined || val === null || val === '')) {
        failures.push({
          fieldId: field.fieldId,
          message: `Field '${field.label}' is mandatory.`
        });
      } else if (val && field.validationPattern) {
        const regex = new RegExp(field.validationPattern);
        if (!regex.test(String(val))) {
          failures.push({
            fieldId: field.fieldId,
            message: field.errorMessage || `Field '${field.label}' format is invalid.`
          });
        }
      }
    }

    res.json({
      success: failures.length === 0,
      failures
    });
  })
);
