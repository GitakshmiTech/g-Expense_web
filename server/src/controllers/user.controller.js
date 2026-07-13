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

<<<<<<< HEAD
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
=======
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

  const rows = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header row
    
    // We map by index since column names might slightly vary, 
    // but it's safer to read headers first. Let's do header mapping.
  });
  
  // Let's implement header-based mapping for robust extraction
  const headers = {};
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    const colName = cell.value.toString().trim().toLowerCase();
    if (!headers[colName]) {
      headers[colName] = colNumber;
    }
  });

  const users = [];
  let addedCount = 0;
  let updatedCount = 0;
  let errorCount = 0;
  const errorDetails = [];

  for (let i = 2; i <= worksheet.rowCount; i++) {
    const row = worksheet.getRow(i);
    const getVal = (colName) => {
      // First try an exact match
      let colIdx = Object.keys(headers).find(k => k === colName.toLowerCase());
      // If no exact match, try includes
      if (colIdx === undefined) {
        colIdx = Object.keys(headers).find(k => k.includes(colName.toLowerCase()));
      }
      if (colIdx !== undefined) {
        const cell = row.getCell(headers[colIdx]);
        return cell ? cell.text || cell.value : undefined;
      }
      return undefined;
    };

    const employeeCode = getVal('employee code') || getVal('emp id');
    const name = getVal('name');
    const email = getVal('official email') || getVal('company mail') || getVal('personal email') || getVal('email');
    
    if (!email) {
      errorCount++;
      errorDetails.push(`Row ${i}: Missing email address.`);
      continue;
    }

    // Get DOB strictly from the column next to Designation (User specified it's column G or next to Designation)
    let dob = '';
    const designationColIdx = Object.keys(headers).find(k => k === 'designation');
    if (designationColIdx !== undefined) {
      const dobCellIndex = headers[designationColIdx] + 1;
      const cell = row.getCell(dobCellIndex);
      dob = cell ? cell.text || cell.value : '';
    }

    let birthYear = '';
    if (dob) {
      if (dob instanceof Date) {
        birthYear = dob.getFullYear().toString();
      } else {
        const yearMatch = dob.toString().match(/\b(19|20)\d{2}\b/);
        if (yearMatch) birthYear = yearMatch[0];
      }
    }

    let autoPassword = 'Expense@123';
    if (name && birthYear) {
      const nameParts = name.toString().trim().split(/\s+/);
      const firstPart = nameParts[0] || '';
      const lastPart = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
      const f3 = firstPart.substring(0, 3).toLowerCase();
      const l3 = lastPart.substring(0, 3).toLowerCase();
      autoPassword = `${f3}${l3}@${birthYear}`;
    }

    const passwordRaw = getVal('password') || autoPassword;
    // Do NOT hash the password here, because User.create triggers the pre('save') hook which hashes it!
    const password = passwordRaw.toString();
    
    const department = getVal('department') || '';
    const designation = getVal('designation') || '';
    const phone = getVal('mobile') || getVal('phone') || '';
    const bankName = getVal('bank name') || '';
    const accountNumber = getVal('ac number') || getVal('account number') || '';
    const ifscCode = getVal('ifsic') || getVal('ifsc') || '';

    const finalEmployeeCode = employeeCode ? employeeCode.toString() : `EMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const userData = {
      companyId: req.companyId,
      name: name || email.split('@')[0],
      email: email.toString().toLowerCase().trim(),
      password,
      employeeId: finalEmployeeCode,
      employeeCode: finalEmployeeCode,
      department: department.toString(),
      designation: designation.toString(),
      phone: phone.toString(),
      bankDetails: {
        bankName: bankName.toString(),
        accountNumber: accountNumber.toString(),
        ifscCode: ifscCode.toString(),
      },
      role: 'employee'
    };

    const existingUser = await User.findOne({ 
      companyId: req.companyId, 
      $or: [{ email: userData.email }, ...(userData.employeeId ? [{ employeeId: userData.employeeId }] : [])] 
    });

    try {
      if (existingUser) {
        // Don't overwrite password if updating existing user via bulk upload unless we want to force reset
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
>>>>>>> main
});
