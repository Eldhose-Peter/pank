import { z } from 'zod';

export const recordSettlementSchema = z
  .object({
    payerMemberId: z.string().uuid('Invalid payer member ID'),
    payeeMemberId: z.string().uuid('Invalid payee member ID'),
    amount: z
      .number()
      .int('Settlement amount must be an integer in minor units')
      .positive('Settlement amount must be greater than zero'),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, 'Currency must be a 3-letter ISO code')
      .default('INR'),
    paymentMethod: z
      .string()
      .trim()
      .max(50, 'Payment method must be 50 characters or fewer')
      .optional(),
    notes: z
      .string()
      .trim()
      .max(500, 'Notes must be 500 characters or fewer')
      .optional(),
    settledAt: z
      .string()
      .datetime({ offset: true })
      .optional()
      .default(() => new Date().toISOString()),
  })
  .refine((data) => data.payerMemberId !== data.payeeMemberId, {
    message: 'Payer and payee cannot be the same member',
    path: ['payeeMemberId'],
  });

export type ValidatedRecordSettlementDTO = z.infer<typeof recordSettlementSchema>;
