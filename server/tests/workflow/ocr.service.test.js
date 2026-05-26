import assert from 'node:assert/strict';
import test from 'node:test';
import { extractReceiptFields } from '../../src/services/ocr.service.js';

test('OCR service falls back safely when Gemini key is unavailable', async () => {
  const previous = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  const result = await extractReceiptFields({ originalname: 'Cafe-1250.jpg', buffer: Buffer.from('not an image') });

  assert.equal(result.provider, 'fallback');
  assert.equal(result.amount, 0);
  assert.equal(result.merchant, null);
  assert.equal(result.currency, 'INR');
  assert.ok(result.confidence < 0.2);

  if (previous) process.env.GEMINI_API_KEY = previous;
});
