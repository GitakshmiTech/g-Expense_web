import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateSharedAllocations } from '../../src/services/sharedExpense.service.js';

test('equal shared split balances amount and tax across participants', () => {
  const rows = calculateSharedAllocations({
    totalAmount: 2500,
    taxAmount: 250,
    splitType: 'equal',
    participantIds: ['665000000000000000000001', '665000000000000000000002', '665000000000000000000003', '665000000000000000000004', '665000000000000000000005']
  });

  assert.equal(rows.length, 5);
  assert.equal(rows.reduce((sum, row) => sum + row.allocatedAmount, 0), 2500);
  assert.equal(rows.reduce((sum, row) => sum + row.allocatedTaxAmount, 0), 250);
  assert.ok(rows.every((row) => row.allocatedAmount === 500));
});

test('percentage shared split requires exactly 100 percent', () => {
  assert.throws(() => calculateSharedAllocations({
    totalAmount: 2500,
    splitType: 'percentage',
    participantIds: ['665000000000000000000001', '665000000000000000000002'],
    splitValues: { '665000000000000000000001': 40, '665000000000000000000002': 50 }
  }), /Percentage split total must equal 100/);
});

test('custom shared split requires total to match expense amount', () => {
  assert.throws(() => calculateSharedAllocations({
    totalAmount: 2500,
    splitType: 'custom',
    participantIds: ['665000000000000000000001', '665000000000000000000002'],
    splitValues: { '665000000000000000000001': 1000, '665000000000000000000002': 1400 }
  }), /Custom split total must equal total expense amount/);
});

test('duplicate shared participants are blocked', () => {
  assert.throws(() => calculateSharedAllocations({
    totalAmount: 2500,
    splitType: 'equal',
    participantIds: ['665000000000000000000001', '665000000000000000000001']
  }), /Duplicate participants/);
});
