import assert from 'node:assert/strict';
import test from 'node:test';
import { rejectNoSqlOperators } from '../../src/middleware/sanitize.middleware.js';

const run = (req) => new Promise((resolve) => {
  rejectNoSqlOperators(req, {}, (error) => resolve(error));
});

test('NoSQL operator payloads are rejected', async () => {
  const error = await run({ body: { email: { $ne: null } }, query: {}, params: {} });
  assert.equal(error.statusCode, 400);
});

test('dot notation payload keys are rejected', async () => {
  const error = await run({ body: { 'profile.role': 'admin' }, query: {}, params: {} });
  assert.equal(error.statusCode, 400);
});

test('normal request payloads pass sanitizer', async () => {
  const error = await run({ body: { category: 'Meals', amount: 500 }, query: { status: 'DRAFT' }, params: {} });
  assert.equal(error, undefined);
});
