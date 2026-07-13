import { writeAudit } from '../audit/audit.service.js';
import { asyncHandler } from '../helpers/asyncHandler.js';
import { ApiError } from '../helpers/apiError.js';
import { tenantFilter } from '../middleware/tenant.middleware.js';
import { notifyRole } from '../notification/notification.service.js';
import { EnterpriseService, moduleRegistry } from '../services/enterprise.service.js';

const makeService = (req) => {
  if (!moduleRegistry[req.params.module]) throw new ApiError(404, 'Enterprise module not found');
  return new EnterpriseService(req.params.module);
};

export const listEnterpriseModules = asyncHandler(async (_req, res) => {
  res.json(
    Object.entries(moduleRegistry).map(([key, value]) => ({
      key,
      label: value.label,
      permission: value.permission
    }))
  );
});

export const listEnterpriseRecords = asyncHandler(async (req, res) => {
  const service = makeService(req);
  const filter = { ...tenantFilter(req) };
  const personalModules = ['reimbursements', 'expense_reports', 'trips', 'budgets'];
  if (req.params.module === 'reimbursements') {
    filter.employeeId = req.user._id;
  } else {
    const isPrivileged = ['company_admin', 'super_admin', 'finance', 'cfo'].includes(req.user.role);
    if (personalModules.includes(req.params.module) && !isPrivileged) {
      filter.employeeId = req.user._id;
    }
  }
  res.json(await service.list(filter, req.query));
});

export const createEnterpriseRecord = asyncHandler(async (req, res) => {
  const service = makeService(req);
  const record = await service.create(tenantFilter(req), req.body, req.user);
  await writeAudit({
    req,
    action: `${req.params.module}.create`,
    entity: req.params.module,
    entityId: record._id.toString(),
    after: record.toObject()
  });
  if (req.params.module === 'expense_categories') {
    await notifyRole({
      companyId: req.companyId,
      roles: ['company_admin', 'finance', 'cfo'],
      excludeUserIds: [req.user?._id],
      title: 'Expense category created',
      message: `${req.user?.name || 'Admin'} created category "${record.name}" (${record.code}).`,
      category: 'policy',
      priority: 'normal',
      actionUrl: '/expense-categories',
      data: { kind: 'expense_category', categoryId: record._id, code: record.code, action: 'created' }
    });
  }
  res.status(201).json(record);
});

export const updateEnterpriseRecord = asyncHandler(async (req, res) => {
  const service = makeService(req);
  const record = await service.update(tenantFilter(req), req.params.id, req.body, req.user);
  if (!record) throw new ApiError(404, 'Record not found');
  await writeAudit({
    req,
    action: `${req.params.module}.update`,
    entity: req.params.module,
    entityId: req.params.id,
    after: record.toObject()
  });
  if (req.params.module === 'expense_categories') {
    await notifyRole({
      companyId: req.companyId,
      roles: ['company_admin', 'finance', 'cfo'],
      excludeUserIds: [req.user?._id],
      title: 'Expense category updated',
      message: `${req.user?.name || 'Admin'} updated category "${record.name}" (${record.code}).`,
      category: 'policy',
      priority: 'normal',
      actionUrl: '/expense-categories',
      data: { kind: 'expense_category', categoryId: record._id, code: record.code, action: 'updated' }
    });
  }
  res.json(record);
});

export const deleteEnterpriseRecord = asyncHandler(async (req, res) => {
  const service = makeService(req);
  const record = await service.remove(tenantFilter(req), req.params.id);
  if (!record) throw new ApiError(404, 'Record not found');
  await writeAudit({
    req,
    action: `${req.params.module}.delete`,
    entity: req.params.module,
    entityId: req.params.id,
    before: record.toObject()
  });
  res.status(204).end();
});
