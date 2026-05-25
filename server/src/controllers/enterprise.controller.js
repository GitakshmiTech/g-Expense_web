import { writeAudit } from '../audit/audit.service.js';
import { asyncHandler } from '../helpers/asyncHandler.js';
import { ApiError } from '../helpers/apiError.js';
import { tenantFilter } from '../middleware/tenant.middleware.js';
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
  const isPrivileged = ['company_admin', 'super_admin', 'finance', 'cfo'].includes(req.user.role);
  if (personalModules.includes(req.params.module) && !isPrivileged) {
    filter.employeeId = req.user._id;
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
