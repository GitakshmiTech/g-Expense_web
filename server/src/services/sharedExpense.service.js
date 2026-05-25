import mongoose from 'mongoose';
import { ApiError } from '../helpers/apiError.js';
import { Expense } from '../models/Expense.js';
import { ExpenseParticipant, ExpenseSplitAllocation } from '../models/ExpenseEcosystem.js';
import { Policy } from '../models/Policy.js';
import { User } from '../models/User.js';

const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const ensureObjectIds = (ids = []) => ids.map((id) => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, `Invalid employee id '${id}'`);
  return String(id);
});

const ensureUnique = (ids = []) => {
  const normalized = ensureObjectIds(ids);
  const unique = new Set(normalized);
  if (unique.size !== normalized.length) throw new ApiError(400, 'Duplicate participants are not allowed');
  return normalized;
};

export const calculateSharedAllocations = ({ totalAmount, taxAmount = 0, splitType = 'equal', participantIds = [], splitValues = {} }) => {
  const participants = ensureUnique(participantIds);
  if (!participants.length) throw new ApiError(400, 'At least one participant is required');
  const total = roundMoney(totalAmount);
  const tax = roundMoney(taxAmount);
  if (total <= 0) throw new ApiError(400, 'Shared expense amount must be greater than zero');

  if (splitType === 'equal') {
    const base = roundMoney(total / participants.length);
    const taxBase = roundMoney(tax / participants.length);
    let running = 0;
    let taxRunning = 0;
    return participants.map((employeeId, index) => {
      const isLast = index === participants.length - 1;
      const allocatedAmount = isLast ? roundMoney(total - running) : base;
      const allocatedTaxAmount = isLast ? roundMoney(tax - taxRunning) : taxBase;
      running = roundMoney(running + allocatedAmount);
      taxRunning = roundMoney(taxRunning + allocatedTaxAmount);
      return { employeeId, allocatedAmount, allocatedTaxAmount, splitPercentage: roundMoney((allocatedAmount / total) * 100) };
    });
  }

  if (splitType === 'percentage') {
    const percentageTotal = roundMoney(participants.reduce((sum, employeeId) => sum + Number(splitValues[employeeId] || 0), 0));
    if (percentageTotal !== 100) throw new ApiError(400, 'Percentage split total must equal 100');
    let running = 0;
    let taxRunning = 0;
    return participants.map((employeeId, index) => {
      const splitPercentage = roundMoney(splitValues[employeeId]);
      const isLast = index === participants.length - 1;
      const allocatedAmount = isLast ? roundMoney(total - running) : roundMoney(total * splitPercentage / 100);
      const allocatedTaxAmount = isLast ? roundMoney(tax - taxRunning) : roundMoney(tax * splitPercentage / 100);
      running = roundMoney(running + allocatedAmount);
      taxRunning = roundMoney(taxRunning + allocatedTaxAmount);
      return { employeeId, allocatedAmount, allocatedTaxAmount, splitPercentage };
    });
  }

  if (splitType === 'custom') {
    const amountTotal = roundMoney(participants.reduce((sum, employeeId) => sum + Number(splitValues[employeeId] || 0), 0));
    if (amountTotal !== total) throw new ApiError(400, 'Custom split total must equal total expense amount');
    return participants.map((employeeId) => {
      const allocatedAmount = roundMoney(splitValues[employeeId]);
      const splitPercentage = roundMoney((allocatedAmount / total) * 100);
      return { employeeId, allocatedAmount, allocatedTaxAmount: roundMoney(tax * splitPercentage / 100), splitPercentage };
    });
  }

  throw new ApiError(400, 'Unsupported shared expense split type');
};

export const validateSharedParticipants = async ({ companyId, participantIds }) => {
  const ids = ensureUnique(participantIds);
  const employees = await User.find({ companyId, _id: { $in: ids }, status: 'active' }).select('name department role');
  if (employees.length !== ids.length) throw new ApiError(400, 'One or more participants are invalid or inactive');
  return employees;
};

export const evaluateSharedAllocationPolicies = async ({ companyId, expense, allocations }) => {
  const policies = await Policy.find({
    companyId,
    active: true,
    $or: [{ 'rules.category': expense.category }, { 'rules.category': { $exists: false } }]
  }).lean();

  const byEmployee = new Map();
  for (const allocation of allocations) {
    const violations = [];
    for (const policy of policies) {
      const matchingRules = (policy.rules || []).filter((rule) => !rule.category || rule.category === expense.category);
      for (const rule of matchingRules) {
        if (rule.maxAmount && allocation.allocatedAmount > rule.maxAmount) {
          violations.push({
            code: 'SHARED_POLICY_LIMIT',
            message: `${expense.category} share ${allocation.allocatedAmount} exceeds per-employee limit ${rule.maxAmount}`,
            severity: rule.severity === 'block' ? 'block' : 'warning'
          });
        }
        if (rule.receiptRequiredAbove && allocation.allocatedAmount > rule.receiptRequiredAbove && !expense.receipts?.length) {
          violations.push({
            code: 'SHARED_RECEIPT_REQUIRED',
            message: `Receipt is mandatory for per-employee share above ${rule.receiptRequiredAbove}`,
            severity: rule.severity === 'block' ? 'block' : 'warning'
          });
        }
      }
    }
    byEmployee.set(String(allocation.employeeId), violations);
  }
  return byEmployee;
};

export const upsertSharedExpenseRecords = async ({ companyId, expense, creatorId, participantIds, splitType, splitValues, reimbursementMode = 'creator_full' }) => {
  const employees = await validateSharedParticipants({ companyId, participantIds });
  const allocations = calculateSharedAllocations({
    totalAmount: expense.amount,
    taxAmount: expense.taxAmount,
    splitType,
    participantIds: participantIds.map(String),
    splitValues
  });
  const policyResults = await evaluateSharedAllocationPolicies({ companyId, expense, allocations });

  await ExpenseParticipant.deleteMany({ companyId, expenseId: expense._id });
  await ExpenseSplitAllocation.deleteMany({ companyId, expenseId: expense._id });

  const employeeById = new Map(employees.map((employee) => [String(employee._id), employee]));
  const participants = await ExpenseParticipant.insertMany(allocations.map((allocation) => {
    const employee = employeeById.get(String(allocation.employeeId));
    return {
      companyId,
      expenseId: expense._id,
      employeeId: employee._id,
      employeeName: employee.name,
      departmentId: employee.department,
      participationType: String(employee._id) === String(creatorId) ? 'creator' : 'participant',
      approvalStatus: 'pending',
      addedBy: creatorId
    };
  }));

  const splitAllocations = await ExpenseSplitAllocation.insertMany(allocations.map((allocation) => ({
    companyId,
    expenseId: expense._id,
    employeeId: allocation.employeeId,
    allocatedAmount: allocation.allocatedAmount,
    allocatedTaxAmount: allocation.allocatedTaxAmount,
    splitPercentage: allocation.splitPercentage,
    reimbursementMode,
    reimbursementStatus: reimbursementMode === 'creator_full' && String(allocation.employeeId) !== String(creatorId) ? 'not_due' : 'pending',
    policyViolations: policyResults.get(String(allocation.employeeId)) || []
  })));

  expense.isSharedExpense = true;
  expense.totalAmount = expense.amount;
  expense.splitType = splitType;
  expense.participantCount = participants.length;
  expense.reimbursementMode = reimbursementMode;
  expense.sharedExpenseMeta = {
    allocationTotal: roundMoney(splitAllocations.reduce((sum, item) => sum + item.allocatedAmount, 0)),
    taxAllocationTotal: roundMoney(splitAllocations.reduce((sum, item) => sum + (item.allocatedTaxAmount || 0), 0)),
    validationStatus: 'valid',
    lastCalculatedAt: new Date()
  };

  const sharedViolations = splitAllocations.flatMap((allocation) => (allocation.policyViolations || []).map((violation) => ({
    ...violation,
    code: `${violation.code}_${String(allocation.employeeId).slice(-4)}`
  })));
  expense.policyViolations = [...(expense.policyViolations || []).filter((v) => !String(v.code).startsWith('SHARED_')), ...sharedViolations];
  expense.timeline.push({ status: expense.status, action: 'shared_split_calculated', actorId: creatorId, note: `${splitType} split across ${participants.length} participants` });
  await expense.save();

  return { participants, allocations: splitAllocations };
};

export const loadSharedExpenseDetails = async ({ companyId, expenseId }) => {
  const [expense, participants, allocations] = await Promise.all([
    Expense.findOne({ companyId, _id: expenseId }).populate('employeeId', 'name email department').lean(),
    ExpenseParticipant.find({ companyId, expenseId }).sort({ createdAt: 1 }).lean(),
    ExpenseSplitAllocation.find({ companyId, expenseId }).sort({ createdAt: 1 }).lean()
  ]);
  if (!expense) throw new ApiError(404, 'Shared expense not found');
  return { expense, participants, allocations };
};
