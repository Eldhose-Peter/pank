import { z } from 'zod';

export const payerInputSchema = z.object({
  groupMemberId: z.string().uuid('Invalid member ID for payer'),
  amountPaid: z.number().int('Payment amount must be an integer').positive('Payment amount must be positive'),
});

export const participantSplitInputSchema = z.object({
  groupMemberId: z.string().uuid('Invalid member ID for participant'),
  splitValue: z.number().nonnegative('Split value cannot be negative').optional(),
});

export const createExpenseSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title cannot be empty')
      .max(200, 'Title must be 200 characters or fewer'),
    description: z
      .string()
      .trim()
      .max(1000, 'Description must be 1000 characters or fewer')
      .optional(),
    amount: z
      .number()
      .int('Amount must be an integer in minor units')
      .positive('Amount must be greater than zero'),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, 'Currency must be a 3-letter ISO code')
      .default('INR'),
    splitType: z.enum(['equal', 'exact', 'percentage', 'shares']),
    expenseDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expense date must be in YYYY-MM-DD format')
      .default(() => new Date().toISOString().split('T')[0]),
    idempotencyKey: z.string().uuid('Idempotency key must be a valid UUID').optional(),
    receiptUrl: z.string().nullable().optional(),
    payers: z.array(payerInputSchema).optional(),
    paidByMemberId: z.string().uuid('Invalid payer member ID').optional(),
    participants: z
      .array(participantSplitInputSchema)
      .min(1, 'At least one participant is required'),
  })
  .refine(
    (data) => (data.payers && data.payers.length > 0) || Boolean(data.paidByMemberId),
    {
      message: 'Either payers list or paidByMemberId must be provided',
      path: ['payers'],
    }
  );

export const updateExpenseSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title cannot be empty')
      .max(200, 'Title must be 200 characters or fewer'),
    description: z
      .string()
      .trim()
      .max(1000, 'Description must be 1000 characters or fewer')
      .optional(),
    amount: z
      .number()
      .int('Amount must be an integer in minor units')
      .positive('Amount must be greater than zero'),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, 'Currency must be a 3-letter ISO code')
      .default('INR'),
    splitType: z.enum(['equal', 'exact', 'percentage', 'shares']),
    expenseDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expense date must be in YYYY-MM-DD format')
      .default(() => new Date().toISOString().split('T')[0]),
    receiptUrl: z.string().nullable().optional(),
    payers: z.array(payerInputSchema).optional(),
    paidByMemberId: z.string().uuid('Invalid payer member ID').optional(),
    participants: z
      .array(participantSplitInputSchema)
      .min(1, 'At least one participant is required'),
  })
  .refine(
    (data) => (data.payers && data.payers.length > 0) || Boolean(data.paidByMemberId),
    {
      message: 'Either payers list or paidByMemberId must be provided',
      path: ['payers'],
    }
  );

export type ValidatedCreateExpenseDTO = z.infer<typeof createExpenseSchema>;
export type ValidatedUpdateExpenseDTO = z.infer<typeof updateExpenseSchema>;
