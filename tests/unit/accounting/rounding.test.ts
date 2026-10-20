import { describe, it, expect } from 'vitest';
import { distributeRemainder } from '@/modules/accounting/rounding';

describe('Accounting: distributeRemainder (Largest Remainder Method)', () => {
  it('distributes 1 remainder unit deterministically when dividing 100 among 3', () => {
    // 100 / 3 = 33.3333...
    const items = [
      { id: 'user-a' },
      { id: 'user-b' },
      { id: 'user-c' },
    ];
    const totalAmount = 100;
    const fractions = [33.3333333, 33.3333333, 33.3333333];
    const baseAmounts = [33, 33, 33]; // sum = 99, remainder = 1

    const result = distributeRemainder(items, fractions, baseAmounts, totalAmount);

    expect(result.reduce((a, b) => a + b, 0)).toBe(100);
    // User-a gets the extra 1 unit due to lexicographical tie-break
    expect(result).toEqual([34, 33, 33]);
  });

  it('distributes 2 remainder units across 4 users correctly', () => {
    // 10002 / 4 = 2500.5
    const items = [
      { id: 'user-1' },
      { id: 'user-2' },
      { id: 'user-3' },
      { id: 'user-4' },
    ];
    const totalAmount = 10002;
    const fractions = [2500.5, 2500.5, 2500.5, 2500.5];
    const baseAmounts = [2500, 2500, 2500, 2500]; // sum = 10000, remainder = 2

    const result = distributeRemainder(items, fractions, baseAmounts, totalAmount);

    expect(result.reduce((a, b) => a + b, 0)).toBe(10002);
    expect(result).toEqual([2501, 2501, 2500, 2500]);
  });

  it('preserves amounts when remainder is 0', () => {
    const items = [{ id: 'a' }, { id: 'b' }];
    const totalAmount = 100;
    const fractions = [50, 50];
    const baseAmounts = [50, 50];

    const result = distributeRemainder(items, fractions, baseAmounts, totalAmount);
    expect(result).toEqual([50, 50]);
  });
});
