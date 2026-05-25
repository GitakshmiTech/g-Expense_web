import { z } from 'zod';

export const expenseFormSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  merchant: z.string().optional(),
  expenseDate: z.string().min(1, 'Date is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  currency: z.string().min(3),
  paymentMode: z.string(),
  description: z.string().optional(),
  taxAmount: z.coerce.number().nonnegative('Tax amount must be non-negative').optional().default(0),
  gstNumber: z.string().optional(),
  status: z.enum(['draft', 'submitted', 'DRAFT', 'SUBMITTED']),
  sharedExpense: z.any().optional()
});
