import { describe, it, expect } from 'vitest';
import {
  createExpenseSchema,
  updateExpenseSchema,
} from '@/modules/expenses/validation';

describe('Expenses: Validation Schemas', () => {
  const memberA = '123e4567-e89b-12d3-a456-426614174001';
  const memberB = '123e4567-e89b-12d3-a456-426614174002';
  const memberC = '123e4567-e89b-12d3-a456-426614174003';

  describe('createExpenseSchema', () => {
    it('validates a valid single-payer equal split expense', () => {
      const result = createExpenseSchema.safeParse({
        title: 'Team Dinner',
        amount: 240000, // ₹2,400 in paise
        splitType: 'equal',
        paidByMemberId: memberA,
        participants: [
          { groupMemberId: memberA },
          { groupMemberId: memberB },
          { groupMemberId: memberC },
        ],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currency).toBe('INR');
        expect(result.data.amount).toBe(240000);
      }
    });

    it('validates a valid multi-payer expense', () => {
      const result = createExpenseSchema.safeParse({
        title: 'Groceries',
        amount: 300000,
        currency: 'INR',
        splitType: 'exact',
        payers: [
          { groupMemberId: memberA, amountPaid: 150000 },
          { groupMemberId: memberB, amountPaid: 150000 },
        ],
        participants: [
          { groupMemberId: memberA, splitValue: 100000 },
          { groupMemberId: memberB, splitValue: 100000 },
          { groupMemberId: memberC, splitValue: 100000 },
        ],
      });

      expect(result.success).toBe(true);
    });

    it('rejects an expense with non-positive amount', () => {
      const result = createExpenseSchema.safeParse({
        title: 'Free Food',
        amount: 0,
        splitType: 'equal',
        paidByMemberId: memberA,
        participants: [{ groupMemberId: memberA }],
      });

      expect(result.success).toBe(false);
    });

    it('rejects an expense with floating-point amount', () => {
      const result = createExpenseSchema.safeParse({
        title: 'Coffee',
        amount: 150.5,
        splitType: 'equal',
        paidByMemberId: memberA,
        participants: [{ groupMemberId: memberA }],
      });

      expect(result.success).toBe(false);
    });

    it('rejects an expense without payers or paidByMemberId', () => {
      const result = createExpenseSchema.safeParse({
        title: 'Ghost Lunch',
        amount: 50000,
        splitType: 'equal',
        participants: [{ groupMemberId: memberA }],
      });

      expect(result.success).toBe(false);
    });

    it('rejects an expense with empty participants list', () => {
      const result = createExpenseSchema.safeParse({
        title: 'Solo Coffee',
        amount: 50000,
        splitType: 'equal',
        paidByMemberId: memberA,
        participants: [],
      });

      expect(result.success).toBe(false);
    });

    it('validates custom expense date format YYYY-MM-DD', () => {
      const result = createExpenseSchema.safeParse({
        title: 'Concert',
        amount: 100000,
        splitType: 'equal',
        paidByMemberId: memberA,
        expenseDate: '2026-10-15',
        participants: [{ groupMemberId: memberA }],
      });

      expect(result.success).toBe(true);
    });

    it('rejects invalid date format', () => {
      const result = createExpenseSchema.safeParse({
        title: 'Concert',
        amount: 100000,
        splitType: 'equal',
        paidByMemberId: memberA,
        expenseDate: '15/10/2026',
        participants: [{ groupMemberId: memberA }],
      });

      expect(result.success).toBe(false);
    });
  });

  describe('updateExpenseSchema', () => {
    it('validates a valid update payload', () => {
      const result = updateExpenseSchema.safeParse({
        title: 'Updated Dinner Title',
        amount: 250000,
        splitType: 'equal',
        paidByMemberId: memberA,
        participants: [{ groupMemberId: memberA }, { groupMemberId: memberB }],
      });

      expect(result.success).toBe(true);
    });
  });
});
