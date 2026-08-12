import bcrypt from 'bcryptjs';
import ExcelJS from 'exceljs';
import { asyncHandler } from '../helpers/asyncHandler.js';
import { ApiError } from '../helpers/apiError.js';
import { tenantFilter } from '../middleware/tenant.middleware.js';
import { User } from '../models/User.js';
import { writeAudit } from '../audit/audit.service.js';
import { invalidatePermissionCache } from '../services/permission.service.js';

export const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find(tenantFilter(req)).select('-password').sort({ createdAt: -1 });
  res.json(users);
});

export const listUserDirectory = asyncHandler(async (req, res) => {
  const users = await User.find({ ...tenantFilter(req), status: 'active' })
    .select('_id name email department role status')
    .sort({ name: 1 });
  res.json(users);
});

export const createUser = asyncHandler(async (req, res) => {
  const user = await User.create({ ...req.body, companyId: req.companyId || req.body.companyId });
  await writeAudit({ req, action: 'user.create', entity: 'User', entityId: user._id.toString(), after: user.toObject() });
  res.status(201).json(user);
});

export const updateUser = asyncHandler(async (req, res) => {
  const isSelf = req.params.id === req.user._id.toString();
  const isAdmin = ['company_admin', 'super_admin'].includes(req.user.role);
  if (!isSelf && !isAdmin) {
    res.status(403);
    throw new Error('Forbidden: You can only update your own profile');
  }

  const updateData = { ...req.body };
  const requestedPassword = updateData.newPassword || updateData.password;
  const isPasswordChange = Boolean(updateData.passwordChange || requestedPassword);

  delete updateData.passwordChange;
  delete updateData.currentPassword;
  delete updateData.newPassword;
  delete updateData.confirmPassword;
  delete updateData.password;

  if (!isAdmin) {
    delete updateData.role;
    delete updateData.permissions;
    delete updateData.companyId;
    delete updateData.status;
  }

  if (updateData.password) {
    updateData.password = await bcrypt.hash(updateData.password, 12);
  } else {
    delete updateData.password;
  }

  const before = await User.findOne({ _id: req.params.id, ...tenantFilter(req) });
  if (!before) throw new ApiError(404, 'User not found');

  if (isPasswordChange) {
    if (!isSelf) throw new ApiError(403, 'You can only change your own password');
    if (!req.body.currentPassword) throw new ApiError(400, 'Current password is required');
    if (String(requestedPassword || '').length < 6) throw new ApiError(400, 'New password must be at least 6 characters');

    const userWithPassword = await User.findOne({ _id: req.params.id, ...tenantFilter(req) }).select('+password');
    if (!userWithPassword || !(await userWithPassword.comparePassword(req.body.currentPassword))) {
      throw new ApiError(400, 'Current password is incorrect');
    }
    Object.assign(userWithPassword, updateData);
    userWithPassword.password = requestedPassword;
    userWithPassword.updatedBy = req.user._id;
    await userWithPassword.save();
    const user = await User.findById(userWithPassword._id).select('-password');
    invalidatePermissionCache(req.companyId, user?._id);
    await writeAudit({ req, action: 'user.password_change', entity: 'User', entityId: req.params.id, before, after: user });
    return res.json({ ...user.toObject(), passwordChanged: true, message: 'Password changed successfully' });
  }

  const user = await User.findOneAndUpdate({ _id: req.params.id, ...tenantFilter(req) }, updateData, { new: true }).select('-password');
  invalidatePermissionCache(req.companyId, user?._id);
  await writeAudit({ req, action: 'user.update', entity: 'User', entityId: req.params.id, before, after: user });
  res.json(user);
});

export const updateOwnPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw new ApiError(400, 'Current password and new password are required');
  if (String(newPassword).length < 6) throw new ApiError(400, 'New password must be at least 6 characters');

  const user = await User.findOne({ _id: req.user._id, ...tenantFilter(req) }).select('+password');
  if (!user || !(await user.comparePassword(currentPassword))) throw new ApiError(400, 'Current password is incorrect');

  user.password = newPassword;
  await user.save();
  await writeAudit({ req, action: 'user.password_change', entity: 'User', entityId: user._id.toString() });
  res.json({ message: 'Password changed successfully' });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const isAdmin = ['company_admin', 'super_admin'].includes(req.user.role);
  if (!isAdmin) {
    res.status(403);
    throw new Error('Forbidden: Only admins can delete employees');
  }

  const before = await User.findOne({ _id: req.params.id, ...tenantFilter(req) });
  if (!before) throw new ApiError(404, 'User not found');

  await User.deleteOne({ _id: req.params.id, ...tenantFilter(req) });
  invalidatePermissionCache(req.companyId, req.params.id);
  await writeAudit({ req, action: 'user.delete', entity: 'User', entityId: req.params.id, before });
  res.json({ message: 'User deleted successfully' });
});

export const uploadUsersExcel = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No file uploaded');
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(req.file.buffer);
  
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    res.status(400);
    throw new Error('Excel file is empty');
  }

  const headers = {};
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    const val = cell.value ? String(cell.value).trim().toLowerCase() : '';
    if (val && !headers[val]) {
      headers[val] = colNumber;
    }
  });

  const allCompanyUsers = await User.find(tenantFilter(req)).select('_id name email employeeId role');

  let addedCount = 0;
  let updatedCount = 0;
  let errorCount = 0;
  const errorDetails = [];

  for (let i = 2; i <= worksheet.rowCount; i++) {
    const row = worksheet.getRow(i);
    const getVal = (colName) => {
      let colIdx = Object.keys(headers).find(k => k === colName.toLowerCase());
      if (colIdx === undefined) {
        colIdx = Object.keys(headers).find(k => k.includes(colName.toLowerCase()));
      }
      if (colIdx !== undefined) {
        const cell = row.getCell(headers[colIdx]);
        if (!cell) return undefined;
        if (cell.value && typeof cell.value === 'object' && cell.value.text) return String(cell.value.text).trim();
        return cell.value !== null && cell.value !== undefined ? String(cell.value).trim() : undefined;
      }
      return undefined;
    };

    const email = getVal('official email') || getVal('company mail') || getVal('personal email') || getVal('email') || getVal('email address');
    const name = getVal('name') || getVal('full name') || getVal('employee name');
    
    // Ignore completely empty rows
    if (!email && !name) {
      continue;
    }

    if (!email) {
      errorCount++;
      errorDetails.push(`Row ${i}: Missing email address.`);
      continue;
    }

    const employeeCode = getVal('employee code') || getVal('emp id') || getVal('employee id') || getVal('code');
    const department = getVal('department') || getVal('dept') || '';
    const designation = getVal('designation') || getVal('title') || '';
    const phone = getVal('mobile') || getVal('phone') || getVal('contact') || '';
    const bankName = getVal('bank name') || getVal('bank') || '';
    const accountNumber = getVal('ac number') || getVal('account number') || getVal('account no') || '';
    const ifscCode = getVal('ifsic') || getVal('ifsc') || getVal('ifsc code') || '';
    const roleRaw = getVal('role') || 'employee';

    // Role normalization
    let role = String(roleRaw).toLowerCase().trim().replace(/\s+/g, '_');
    if (!['employee', 'manager', 'finance', 'company_admin', 'cfo', 'super_admin'].includes(role)) {
      role = 'employee';
    }

    // Reporting Manager lookup
    let managerId = null;
    const managerVal = getVal('manager') || getVal('reporting manager') || getVal('manager email');
    if (managerVal) {
      const mValLower = String(managerVal).toLowerCase().trim();
      const foundManager = allCompanyUsers.find(u => 
        u.email.toLowerCase() === mValLower || 
        (u.employeeId && u.employeeId.toLowerCase() === mValLower) ||
        u.name.toLowerCase() === mValLower
      );
      if (foundManager) {
        managerId = foundManager._id;
      }
    }

    let autoPassword = 'Expense@123';
    const passwordRaw = getVal('password') || autoPassword;
    const password = String(passwordRaw).trim() || 'Expense@123';
    const finalEmployeeCode = employeeCode ? String(employeeCode).trim() : `EMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const userData = {
      companyId: req.companyId,
      name: name ? String(name).trim() : email.split('@')[0],
      email: String(email).toLowerCase().trim(),
      password,
      employeeId: finalEmployeeCode,
      employeeCode: finalEmployeeCode,
      department: String(department).trim(),
      designation: String(designation).trim(),
      phone: String(phone).trim(),
      bankDetails: {
        bankName: String(bankName).trim(),
        accountNumber: String(accountNumber).trim(),
        ifscCode: String(ifscCode).trim(),
      },
      role,
      ...(managerId ? { managerId } : {})
    };

    const existingUser = allCompanyUsers.find(u => 
      u.email === userData.email || (userData.employeeId && u.employeeId === userData.employeeId)
    );

    try {
      if (existingUser) {
        delete userData.password; 
        await User.updateOne({ _id: existingUser._id }, { $set: userData });
        updatedCount++;
      } else {
        await User.create(userData);
        addedCount++;
      }
    } catch (err) {
      errorCount++;
      errorDetails.push(`Row ${i} (${userData.email}): ${err.message}`);
    }
  }

  await writeAudit({ req, action: 'user.upload', entity: 'User', after: { addedCount, updatedCount, errorCount, errorDetails } });
  res.json({ added: addedCount, updated: updatedCount, errors: errorCount, errorDetails });
});

export const downloadSampleUsersExcel = asyncHandler(async (req, res) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Sample Employees');
  
  sheet.columns = [
    { header: 'Employee Code', key: 'employeeId', width: 16 },
    { header: 'Full Name', key: 'name', width: 24 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Role', key: 'role', width: 15 },
    { header: 'Department', key: 'department', width: 20 },
    { header: 'Designation', key: 'designation', width: 20 },
    { header: 'Mobile', key: 'phone', width: 16 },
    { header: 'Password', key: 'password', width: 16 },
  ];

  sheet.addRows([
    { employeeId: 'EMP101', name: 'Rahul Sharma', email: 'rahul.sharma@example.com', role: 'employee', department: 'Engineering', designation: 'Software Engineer', phone: '9876543210', password: 'Password@123' },
    { employeeId: 'EMP102', name: 'Priya Patel', email: 'priya.patel@example.com', role: 'manager', department: 'HR', designation: 'HR Manager', phone: '9876543211', password: 'Password@123' },
    { employeeId: 'EMP103', name: 'Amit Kumar', email: 'amit.kumar@example.com', role: 'finance', department: 'Finance', designation: 'Finance Executive', phone: '9876543212', password: 'Password@123' },
  ]);

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '2563EB' }
  };

  res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.header('Content-Disposition', 'attachment; filename="sample_employees_import.xlsx"');
  const buffer = await workbook.xlsx.writeBuffer();
  res.send(buffer);
});

export const exportUsersExcel = asyncHandler(async (req, res) => {
  const users = await User.find(tenantFilter(req)).populate('managerId', 'name').sort({ createdAt: -1 });
  
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Employees');
  
  sheet.columns = [
    { header: 'Employee Code', key: 'employeeId', width: 16 },
    { header: 'Full Name', key: 'name', width: 24 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Role', key: 'role', width: 15 },
    { header: 'Department', key: 'department', width: 20 },
    { header: 'Designation', key: 'designation', width: 20 },
    { header: 'Manager', key: 'manager', width: 22 },
    { header: 'Status', key: 'status', width: 12 },
  ];

  users.forEach((user) => {
    if (user.role === 'company_admin') return;
    sheet.addRow({
      employeeId: user.employeeId || '',
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'employee',
      department: user.department || '',
      designation: user.designation || '',
      manager: user.managerId?.name || '-',
      status: user.status || 'active'
    });
  });

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '1E293B' }
  };

  res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.header('Content-Disposition', `attachment; filename="Employees_Export_${new Date().toISOString().slice(0, 10)}.xlsx"`);
  const buffer = await workbook.xlsx.writeBuffer();
  res.send(buffer);
});
