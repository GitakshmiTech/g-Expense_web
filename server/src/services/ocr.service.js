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

export const extractReceiptFields = async (file) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not set. OCR will run fallback extraction only.');
    return getFallbackOcrResult(file, '[Warning: GEMINI_API_KEY is missing. Add it to .env to enable AI scanning.]');
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

    const prompt = `You are an enterprise expense OCR verifier. Analyze this receipt or invoice and extract structured fields.

Return only JSON. Do not wrap it in markdown.

Fields:
- merchant: merchant/vendor legal or display name
- amount: final payable total as number
- tax: GST/VAT/service tax total as number, 0 if absent
- gstNumber: merchant GSTIN/tax ID, null if absent
- invoiceNumber: invoice or bill number, null if absent
- currency: ISO currency code, default INR for Indian receipts
- invoiceDate: invoice/transaction date in YYYY-MM-DD, null if absent
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

    const parsedData = safeJsonParse(textResponse);
    const invoiceDate = parsedData.invoiceDate || parsedData.date;

    return {
      merchant: parsedData.merchant || 'Unknown Merchant',
      date: invoiceDate ? new Date(invoiceDate) : new Date(),
      invoiceDate: invoiceDate || null,
      tax: typeof parsedData.tax === 'number' ? parsedData.tax : 0,
      amount: typeof parsedData.amount === 'number' ? parsedData.amount : 0,
      gstNumber: parsedData.gstNumber || null,
      invoiceNumber: parsedData.invoiceNumber || null,
      currency: parsedData.currency || 'INR',
      confidence: typeof parsedData.confidence === 'number' ? parsedData.confidence : 0.9,
      warnings: Array.isArray(parsedData.warnings) ? parsedData.warnings : [],
      rawText: textResponse,
      rawResponse: parsedData,
      provider: 'gemini'
    };
  } catch (error) {
    console.error('Gemini OCR API extraction failed. Running fallback extraction:', error);
    return getFallbackOcrResult(file, `[Error calling Gemini OCR: ${error.message}]`);
  }
};

const getFallbackOcrResult = (file, warningMessage) => {
  const name = file.originalname || '';
  const amountMatch = name.match(/(\d+[.]?\d*)/);
  return {
    merchant: name.split('-')[0] || 'Unknown Merchant',
    date: new Date(),
    invoiceDate: new Date().toISOString().slice(0, 10),
    tax: 0,
    amount: amountMatch ? Number(amountMatch[1]) : 0,
    gstNumber: null,
    invoiceNumber: null,
    currency: 'INR',
    confidence: 0.35,
    warnings: ['Fallback extraction used. Verify values before submission.'],
    rawText: `${warningMessage || ''}\nFallback OCR extraction for ${name}.`,
    rawResponse: { fallback: true, fileName: name, warning: warningMessage },
    provider: 'fallback'
  };
};
