import { describe, it, expect } from 'vitest';
import {
  calculateSplits,
  validatePayments,
  AccountingError,
} from '@/modules/accounting/calculations';

describe('Accounting: calculateSplits & validatePayments', () => {
  describe('Equal Split', () => {
    it('splits ₹2,400 (240000 paise) equally among 4 participants', () => {
      const participants = [
        { memberId: 'm-me' },
        { memberId: 'm-rahul' },
        { memberId: 'm-priya' },
        { memberId: 'm-arjun' },
      ];
      const splits = calculateSplits('equal', 240000, participants);

      expect(splits).toHaveLength(4);
      expect(splits.map((s) => s.owedAmount)).toEqual([60000, 60000, 60000, 60000]);
      expect(splits.reduce((sum, s) => sum + s.owedAmount, 0)).toBe(240000);
    });

    it('splits ₹100 (10000 paise) among 3 participants with exact penny distribution', () => {
      const participants = [
        { memberId: 'm-1' },
        { memberId: 'm-2' },
        { memberId: 'm-3' },
      ];
      const splits = calculateSplits('equal', 10000, participants);

      // 10000 / 3 = 3333.33...
      // Total sum must strictly be 10000 paise
      expect(splits.reduce((sum, s) => sum + s.owedAmount, 0)).toBe(10000);
      expect(splits[0].owedAmount).toBe(3334);
      expect(splits[1].owedAmount).toBe(3333);
      expect(splits[2].owedAmount).toBe(3333);
    });
  });

  describe('Exact Split', () => {
    it('accepts exact splits that match total amount exactly', () => {
      const participants = [
        { memberId: 'm-1', splitValue: 15000 },
        { memberId: 'm-2', splitValue: 35000 },
      ];
      const splits = calculateSplits('exact', 50000, participants);

      expect(splits.reduce((sum, s) => sum + s.owedAmount, 0)).toBe(50000);
      expect(splits[0].owedAmount).toBe(15000);
      expect(splits[1].owedAmount).toBe(35000);
    });

    it('throws AccountingError if exact splits do not equal total amount', () => {
      const participants = [
        { memberId: 'm-1', splitValue: 15000 },
        { memberId: 'm-2', splitValue: 30000 }, // sum = 45000 != 50000
      ];

      expect(() => calculateSplits('exact', 50000, participants)).toThrow(
        AccountingError
      );
    });
  });

  describe('Percentage Split', () => {
    it('calculates percentage split correctly and distributes rounding pennies', () => {
      const participants = [
        { memberId: 'm-1', splitValue: 50 },
        { memberId: 'm-2', splitValue: 25 },
        { memberId: 'm-3', splitValue: 25 },
      ];
      const splits = calculateSplits('percentage', 10000, participants);

      expect(splits.reduce((sum, s) => sum + s.owedAmount, 0)).toBe(10000);
      expect(splits[0].owedAmount).toBe(5000);
      expect(splits[1].owedAmount).toBe(2500);
      expect(splits[2].owedAmount).toBe(2500);
    });

    it('throws AccountingError if percentages do not sum to 100%', () => {
      const participants = [
        { memberId: 'm-1', splitValue: 40 },
        { memberId: 'm-2', splitValue: 40 },
      ];

      expect(() => calculateSplits('percentage', 10000, participants)).toThrow(
        AccountingError
      );
    });
  });

  describe('Shares Split', () => {
    it('splits proportionally to share weights with zero loss', () => {
      // 10000 paise split 2 shares vs 1 share
      const participants = [
        { memberId: 'm-1', splitValue: 2 },
        { memberId: 'm-2', splitValue: 1 },
      ];
      const splits = calculateSplits('shares', 10000, participants);

      expect(splits.reduce((sum, s) => sum + s.owedAmount, 0)).toBe(10000);
      expect(splits[0].owedAmount).toBe(6667);
      expect(splits[1].owedAmount).toBe(3333);
    });
  });

  describe('Payment Validation', () => {
    it('validates single payer matches total amount', () => {
      expect(() =>
        validatePayments([{ memberId: 'm-1', amountPaid: 240000 }], 240000)
      ).not.toThrow();
    });

    it('validates multiple payers match total amount', () => {
      expect(() =>
        validatePayments(
          [
            { memberId: 'm-1', amountPaid: 100000 },
            { memberId: 'm-2', amountPaid: 140000 },
          ],
          240000
        )
      ).not.toThrow();
    });

    it('throws error when payment sum does not match total amount', () => {
      expect(() =>
        validatePayments([{ memberId: 'm-1', amountPaid: 200000 }], 240000)
      ).toThrow(AccountingError);
    });
  });
});
