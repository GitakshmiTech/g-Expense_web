import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateExpensePolicy } from '../../src/policies/policy.engine.js';
import { ExpenseCategory, Department } from '../../src/models/Enterprise.js';
import { EnterprisePolicy } from '../../src/models/EnterprisePolicy.js';

// Simple direct stubs for database methods
const originalFindOne = ExpenseCategory.findOne;
const originalDeptFindOne = Department.findOne;
const originalPolicyFind = EnterprisePolicy.find;

test('category policy checks', async (t) => {
  t.beforeEach(() => {
    EnterprisePolicy.find = () => ({
      sort: () => []
    });
  });

  t.afterEach(() => {
    ExpenseCategory.findOne = originalFindOne;
    Department.findOne = originalDeptFindOne;
    EnterprisePolicy.find = originalPolicyFind;
  });

  await t.test('passes validation when expense satisfies limits', async () => {
    ExpenseCategory.findOne = async () => ({
      name: 'Taxi',
      code: 'TAX-01',
      limits: { perExpense: 1000 },
      compliance: { receiptMandatory: false }
    });

    Department.findOne = async () => null;

    const violations = await evaluateExpensePolicy({
      companyId: '665000000000000000000100',
      user: { role: 'employee' },
      expense: { category: 'TAX-01', amount: 500 },
      receiptCount: 0
    });

    assert.equal(violations.length, 0);
  });

  await t.test('fails validation when expense exceeds per-expense limit', async () => {
    ExpenseCategory.findOne = async () => ({
      name: 'Taxi',
      code: 'TAX-01',
      limits: { perExpense: 1000 },
      compliance: { receiptMandatory: false }
    });

    Department.findOne = async () => null;

    const violations = await evaluateExpensePolicy({
      companyId: '665000000000000000000100',
      user: { role: 'employee' },
      expense: { category: 'TAX-01', amount: 1500 },
      receiptCount: 0
    });

    assert.ok(violations.some(v => v.code === 'LIMIT_EXCEEDED'));
  });

  await t.test('fails validation when role limit is exceeded', async () => {
    ExpenseCategory.findOne = async () => ({
      name: 'Flight',
      code: 'FLI-01',
      limits: {
        perExpense: 10000,
        roleBased: { L1_ASSOCIATE: 5000 }
      }
    });

    Department.findOne = async () => null;

    const violations = await evaluateExpensePolicy({
      companyId: '665000000000000000000100',
      user: { role: 'L1_ASSOCIATE' },
      expense: { category: 'FLI-01', amount: 6000 },
      receiptCount: 0
    });

    assert.ok(violations.some(v => v.code === 'LIMIT_EXCEEDED'));
  });

  await t.test('fails validation when receipt is mandatory but missing', async () => {
    ExpenseCategory.findOne = async () => ({
      name: 'Hotel',
      code: 'HOT-01',
      compliance: { receiptMandatory: true }
    });

    Department.findOne = async () => null;

    const violations = await evaluateExpensePolicy({
      companyId: '665000000000000000000100',
      user: { role: 'employee' },
      expense: { category: 'HOT-01', amount: 4000 },
      receiptCount: 0
    });

    assert.ok(violations.some(v => v.code === 'RECEIPT_REQUIRED'));
  });

  await t.test('fails validation when dynamic custom field is missing', async () => {
    ExpenseCategory.findOne = async () => ({
      name: 'Flight',
      code: 'FLI-01',
      dynamicFields: [
        { fieldId: 'ticket_number', label: 'Ticket Number', isRequired: true }
      ]
    });

    Department.findOne = async () => null;

    const violations = await evaluateExpensePolicy({
      companyId: '665000000000000000000100',
      user: { role: 'employee' },
      expense: { category: 'FLI-01', amount: 3000, customFields: {} },
      receiptCount: 1
    });

    assert.ok(violations.some(v => v.code === 'MISSING_REQUIRED_FIELD'));
  });
});
