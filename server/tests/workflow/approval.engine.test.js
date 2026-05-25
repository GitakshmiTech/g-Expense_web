import assert from 'node:assert/strict';
import test from 'node:test';
import { applyApprovalAction } from '../../src/services/approval.engine.js';

test('approval engine advances pending manager approval to finance', async () => {
  const record = {
    status: 'PENDING_MANAGER',
    approvalPath: [
      { approverRole: 'manager', status: 'pending' },
      { approverRole: 'finance', status: 'pending' }
    ]
  };

  await applyApprovalAction({ record, action: 'approve', note: 'ok', actorId: '665000000000000000000001' });

  assert.equal(record.approvalPath[0].status, 'approved');
  assert.equal(record.status, 'PENDING_FINANCE');
});

test('approval engine rejects unsupported lifecycle action', async () => {
  await assert.rejects(() => applyApprovalAction({
    record: { status: 'DRAFT', approvalPath: [] },
    action: 'approve',
    actorId: '665000000000000000000001'
  }), /Cannot approve record with status/);
});

test('approval engine send back returns record to SENT_BACK', async () => {
  const record = { status: 'PENDING_FINANCE', approvalPath: [{ approverRole: 'finance', status: 'pending' }] };
  await applyApprovalAction({ record, action: 'send_back', note: 'missing GST', actorId: '665000000000000000000002' });
  assert.equal(record.status, 'SENT_BACK');
  assert.equal(record.approvalPath[0].status, 'sent_back');
});
