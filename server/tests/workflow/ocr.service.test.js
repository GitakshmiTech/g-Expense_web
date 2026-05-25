import assert from 'node:assert/strict';
import test from 'node:test';
import { extractReceiptFields } from '../../src/services/ocr.service.js';

test('OCR service falls back safely when Gemini key is unavailable', async () => {
  const previous = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  const result = await extractReceiptFields({ originalname: 'Cafe-1250.jpg', buffer: Buffer.from('not an image') });

  assert.equal(result.provider, 'fallback');
  assert.equal(result.amount, 1250);
  assert.equal(result.currency, 'INR');
  assert.ok(result.confidence < 0.5);

  if (previous) process.env.GEMINI_API_KEY = previous;
});
