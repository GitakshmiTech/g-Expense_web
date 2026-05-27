import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

const safeJsonParse = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Gemini did not return JSON');
    return JSON.parse(match[0]);
  }
};

const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-pro'];

const parseMoney = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return 0;
  const cleaned = value.replace(/[^\d.,-]/g, '').replace(/,/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeDate = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const raw = String(value).trim();
  const iso = raw.match(/\b(20\d{2}|19\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  const indian = raw.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2}|19\d{2})\b/);
  if (indian) return `${indian[3]}-${indian[2].padStart(2, '0')}-${indian[1].padStart(2, '0')}`;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
};

const normalizeCurrency = (value) => {
  const raw = String(value || '').toUpperCase();
  if (raw.includes('USD') || raw.includes('$')) return 'USD';
  if (raw.includes('EUR') || raw.includes('€')) return 'EUR';
  if (raw.includes('GBP') || raw.includes('£')) return 'GBP';
  return 'INR';
};

const normalizeOcrResult = (parsedData, rawText, provider = 'gemini') => {
  const invoiceDate = normalizeDate(parsedData.invoiceDate || parsedData.date || parsedData.expenseDate);
  const amount = parseMoney(parsedData.amount || parsedData.total || parsedData.grandTotal || parsedData.netPayable);
  const tax = parseMoney(parsedData.tax || parsedData.gst || parsedData.gstAmount || parsedData.taxAmount);
  const confidence = Number(parsedData.confidence ?? parsedData.overallConfidence ?? 0.9);

  return {
    merchant: String(parsedData.merchant || parsedData.vendor || parsedData.supplier || '').trim() || null,
    date: invoiceDate ? new Date(invoiceDate) : null,
    invoiceDate,
    tax,
    amount,
    gstNumber: parsedData.gstNumber || parsedData.gstin || parsedData.taxId || null,
    invoiceNumber: parsedData.invoiceNumber || parsedData.billNumber || parsedData.receiptNumber || null,
    currency: normalizeCurrency(parsedData.currency || parsedData.currencySymbol),
    category: parsedData.category || null,
    paymentMode: parsedData.paymentMode || parsedData.paymentMethod || null,
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0.9,
    warnings: Array.isArray(parsedData.warnings) ? parsedData.warnings : [],
    rawText,
    rawResponse: parsedData,
    provider
  };
};

const generateWithRetry = async (genAI, modelName, prompt, imagePart, maxRetries = 2) => {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      console.log(`[OCR Service] Attempting OCR with model: ${modelName} (Attempt ${attempt + 1}/${maxRetries + 1})`);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: 'application/json' }
      });
      const result = await model.generateContent([prompt, imagePart]);
      return result.response.text();
    } catch (error) {
      attempt++;
      const message = error.message || String(error);
      const isPermanentAuthOrQuota = error.status === 403 || message.includes('API key was reported as leaked') || (error.status === 429 && message.includes('limit: 0'));
      if (isPermanentAuthOrQuota) throw error;
      const isRateLimitOr503 = error.status === 429 || error.status === 503 || error.message?.includes('503') || error.message?.includes('429') || error.message?.includes('Service Unavailable') || error.message?.includes('Resource has been exhausted');
      if (isRateLimitOr503 && attempt <= maxRetries) {
        const delay = attempt * 1500;
        console.warn(`[OCR Service] Model ${modelName} returned temporary error: ${error.message || error}. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
};

const userSafeOcrWarning = (message = '') => {
  if (message.includes('API key was reported as leaked') || message.includes('403 Forbidden')) {
    return 'Gemini OCR key is blocked. Add a fresh Gemini API key to enable automatic receipt auto-fill.';
  }
  if (message.includes('429 Too Many Requests') || message.includes('quota')) {
    return 'Gemini OCR quota is exhausted. Use a valid API key with available quota to enable automatic receipt auto-fill.';
  }
  if (message.includes('GEMINI_API_KEY is missing')) {
    return 'Gemini OCR key is missing. Add GEMINI_API_KEY to server/.env to enable automatic receipt auto-fill.';
  }
  return 'AI OCR could not read the receipt. Please verify and enter the bill details manually.';
};

export const extractReceiptFields = async (file) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not set. OCR will run fallback extraction only.');
    return getFallbackOcrResult(file, 'GEMINI_API_KEY is missing');
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    let base64Data;
    let mimeType = file.mimetype || 'image/jpeg';

    if (file.path) {
      base64Data = fs.readFileSync(file.path).toString('base64');
    } else if (file.buffer) {
      base64Data = file.buffer.toString('base64');
    } else {
      throw new Error('No file path or buffer available to process');
    }

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType
      }
    };

    const prompt = `You are an enterprise expense OCR verifier. Analyze this receipt or invoice image/PDF and extract structured fields from the actual bill text, not from the file name.

Return only JSON. Do not wrap it in markdown.

Fields:
- merchant: merchant/vendor legal or display name
- amount: final payable total as number
- tax: GST/VAT/service tax total as number, 0 if absent
- gstNumber: merchant GSTIN/tax ID, null if absent
- invoiceNumber: invoice or bill number, null if absent
- currency: ISO currency code, default INR for Indian receipts
- invoiceDate: invoice/transaction date in YYYY-MM-DD, null if absent
- category: one of Meals, Travel, Hotel, Fuel, Software, Office Supplies, Telecom, Training
- paymentMode: cash, card, bank, upi, corporate_card, or null
- confidence: number from 0 to 1 based on field clarity
- warnings: array of short validation warnings

{
  "merchant": string,
  "invoiceDate": string,
  "amount": number,
  "tax": number,
  "gstNumber": string or null,
  "invoiceNumber": string or null,
  "currency": string,
  "category": string,
  "paymentMode": string or null,
  "confidence": number,
  "warnings": string[]
}`;

    let textResponse = null;
    let errorLog = [];

    for (const modelName of modelsToTry) {
      try {
        textResponse = await generateWithRetry(genAI, modelName, prompt, imagePart);
        if (textResponse) {
          console.log(`[OCR Service] OCR succeeded with model: ${modelName}`);
          break;
        }
      } catch (err) {
        console.error(`[OCR Service] Model ${modelName} failed:`, err.message);
        errorLog.push(`${modelName}: ${err.message}`);
      }
    }

    if (!textResponse) {
      throw new Error(`All Gemini models failed. Errors: ${errorLog.join(', ')}`);
    }

    return normalizeOcrResult(safeJsonParse(textResponse), textResponse, 'gemini');
  } catch (error) {
    console.error('Gemini OCR API extraction failed. Running fallback extraction:', error);
    return getFallbackOcrResult(file, error.message);
  }
};

const getFallbackOcrResult = (file, warningMessage) => {
  const name = file.originalname || '';
  return {
    merchant: null,
    date: null,
    invoiceDate: null,
    tax: 0,
    amount: 0,
    gstNumber: null,
    invoiceNumber: null,
    currency: 'INR',
    category: null,
    paymentMode: null,
    confidence: 0.1,
    warnings: [userSafeOcrWarning(warningMessage)],
    rawText: `${warningMessage || ''}\nFallback OCR extraction for ${name}.`,
    rawResponse: { fallback: true, fileName: name, warning: warningMessage },
    provider: 'fallback'
  };
};
