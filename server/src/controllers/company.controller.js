import { asyncHandler } from '../helpers/asyncHandler.js';
import { Company } from '../models/Company.js';
import { User } from '../models/User.js';
import { writeAudit } from '../audit/audit.service.js';
import { ApiError } from '../helpers/apiError.js';

export const createCompany = asyncHandler(async (req, res) => {
  if (req.body.adminEmail) {
    const existing = await User.findOne({ email: req.body.adminEmail });
    if (existing) throw new ApiError(400, 'A user with this email already exists.');
  }

  const company = await Company.create(req.body);
  if (req.body.adminEmail) {
    await User.create({
      companyId: company._id,
      name: req.body.adminName || 'Company Admin',
      email: req.body.adminEmail,
      password: req.body.adminPassword || 'Admin@12345',
      role: 'company_admin',
      permissions: ['users.manage', 'expenses.manage', 'settings.manage', 'reports.view']
    });
  }
  await writeAudit({ req, action: 'company.create', entity: 'Company', entityId: company._id.toString(), after: company.toObject() });
  res.status(201).json(company);
});

export const listCompanies = asyncHandler(async (req, res) => {
  const companies = await Company.find().sort({ createdAt: -1 });
  res.json(companies);
});

export const updateCompany = asyncHandler(async (req, res) => {
  const before = await Company.findById(req.params.id);
  const company = await Company.findByIdAndUpdate(req.params.id, req.body, { new: true });
  await writeAudit({ req, action: 'company.update', entity: 'Company', entityId: req.params.id, before, after: company });
  res.json(company);
});
