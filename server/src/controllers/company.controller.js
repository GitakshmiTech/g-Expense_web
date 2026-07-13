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
  const query = req.user.role === 'company_admin' ? { _id: req.user.companyId } : {};
  const companies = await Company.find(query).sort({ createdAt: -1 });
  const companiesWithAdmin = await Promise.all(companies.map(async (company) => {
    const companyObj = company.toObject();
    if (!companyObj.adminEmail || !companyObj.adminName || !companyObj.adminPassword) {
      const admin = await User.findOne({ companyId: company._id, role: 'company_admin' });
      if (admin) {
        companyObj.adminEmail = companyObj.adminEmail || admin.email;
        companyObj.adminName = companyObj.adminName || admin.name;
      }
      companyObj.adminPassword = companyObj.adminPassword || 'Admin@12345';
    }
    return companyObj;
  }));
  res.json(companiesWithAdmin);
});

export const updateCompany = asyncHandler(async (req, res) => {
  if (req.user.role === 'company_admin' && String(req.user.companyId) !== String(req.params.id)) {
    throw new ApiError(403, 'You do not have permission to update this company');
  }

  const before = await Company.findById(req.params.id);
  const company = await Company.findByIdAndUpdate(req.params.id, req.body, { new: true });
  
  if (req.body.adminEmail || req.body.adminName || req.body.adminPassword) {
    const admin = await User.findOne({ companyId: req.params.id, role: 'company_admin' });
    if (admin) {
      if (req.body.adminEmail) admin.email = req.body.adminEmail;
      if (req.body.adminName) admin.name = req.body.adminName;
      if (req.body.adminPassword) admin.password = req.body.adminPassword; // Pre-save hook hashes it!
      await admin.save();
    }
  }

  await writeAudit({ req, action: 'company.update', entity: 'Company', entityId: req.params.id, before, after: company });
  res.json(company);
});
