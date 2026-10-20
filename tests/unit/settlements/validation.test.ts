import { describe, it, expect } from 'vitest';
import { recordSettlementSchema } from '@/modules/settlements/validation';

describe('Settlements: Validation Schemas', () => {
  const payerId = '123e4567-e89b-12d3-a456-426614174001';
  const payeeId = '123e4567-e89b-12d3-a456-426614174002';

  it('validates a valid settlement between two members', () => {
    const result = recordSettlementSchema.safeParse({
      payerMemberId: payerId,
      payeeMemberId: payeeId,
      amount: 50000, // ₹500 in paise
      currency: 'INR',
      paymentMethod: 'upi',
      notes: 'Settled via Google Pay',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(50000);
      expect(result.data.paymentMethod).toBe('upi');
    }
  });

  it('rejects settlement when payer and payee are the same member', () => {
    const result = recordSettlementSchema.safeParse({
      payerMemberId: payerId,
      payeeMemberId: payerId,
      amount: 50000,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const errorPaths = result.error.issues.map((i) => i.path.join('.'));
      expect(errorPaths).toContain('payeeMemberId');
    }
  });

  it('rejects settlement with zero or negative amount', () => {
    const resultZero = recordSettlementSchema.safeParse({
      payerMemberId: payerId,
      payeeMemberId: payeeId,
      amount: 0,
    });
    expect(resultZero.success).toBe(false);

    const resultNegative = recordSettlementSchema.safeParse({
      payerMemberId: payerId,
      payeeMemberId: payeeId,
      amount: -1000,
    });
    expect(resultNegative.success).toBe(false);
  });

  it('rejects invalid UUIDs for member IDs', () => {
    const result = recordSettlementSchema.safeParse({
      payerMemberId: 'not-a-uuid',
      payeeMemberId: payeeId,
      amount: 50000,
    });

    expect(result.success).toBe(false);
  });
});
