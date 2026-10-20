import { describe, it, expect } from 'vitest';
import {
  calculateSplits,
  validatePayments,
} from '@/modules/accounting/calculations';
import {
  calculateGroupBalances,
  simplifyDebts,
  calculatePairwiseDebts,
} from '@/modules/accounting/balances';
import type { ExpenseRecord, SettlementInput } from '@/modules/accounting/types';

describe('Phase 4: Comprehensive Accounting Accuracy & Debt Minimization', () => {
  it('correctly calculates balances and simplifies debts across a multi-day trip with 5 members', () => {
    const memberIds = ['alice', 'bob', 'charlie', 'dave', 'eve'];

    // Expense 1: Alice paid ₹15,000 (1500000 paise) for Hotel, split equally among all 5
    const splits1 = calculateSplits('equal', 1500000, memberIds.map((id) => ({ memberId: id })));
    expect(splits1.reduce((sum, s) => sum + s.owedAmount, 0)).toBe(1500000);
    for (const s of splits1) {
      expect(s.owedAmount).toBe(300000); // 3,000 each
    }

    // Expense 2: Bob paid ₹4,500 (450000 paise) for Dinner, split with shares: Alice (2), Bob (1), Charlie (1)
    const splits2 = calculateSplits('shares', 450000, [
      { memberId: 'alice', splitValue: 2 },
      { memberId: 'bob', splitValue: 1 },
      { memberId: 'charlie', splitValue: 1 },
    ]);
    expect(splits2.reduce((sum, s) => sum + s.owedAmount, 0)).toBe(450000);
    // 450000 / 4 = 112500 per share -> Alice: 225000, Bob: 112500, Charlie: 112500
    const aliceShare = splits2.find((s) => s.memberId === 'alice')?.owedAmount;
    expect(aliceShare).toBe(225000);

    // Expense 3: Multi-payer Groceries ₹2,400 (240000 paise): Charlie paid 140000, Dave paid 100000
    validatePayments(
      [
        { memberId: 'charlie', amountPaid: 140000 },
        { memberId: 'dave', amountPaid: 100000 },
      ],
      240000
    );
    const splits3 = calculateSplits('equal', 240000, memberIds.map((id) => ({ memberId: id })));
    for (const s of splits3) {
      expect(s.owedAmount).toBe(48000); // 480 each
    }

    // Expense 4: Eve paid ₹1,200 (120000 paise) for Cab, split between Eve and Alice 50/50
    const splits4 = calculateSplits('equal', 120000, [
      { memberId: 'eve' },
      { memberId: 'alice' },
    ]);

    const allExpenses: ExpenseRecord[] = [
      {
        id: 'exp-1',
        amount: 1500000,
        payments: [{ memberId: 'alice', amountPaid: 1500000 }],
        splits: splits1,
      },
      {
        id: 'exp-2',
        amount: 450000,
        payments: [{ memberId: 'bob', amountPaid: 450000 }],
        splits: splits2,
      },
      {
        id: 'exp-3',
        amount: 240000,
        payments: [
          { memberId: 'charlie', amountPaid: 140000 },
          { memberId: 'dave', amountPaid: 100000 },
        ],
        splits: splits3,
      },
      {
        id: 'exp-4',
        amount: 120000,
        payments: [{ memberId: 'eve', amountPaid: 120000 }],
        splits: splits4,
      },
    ];

    // Settlement 1: Bob pays Alice ₹3,000 (300000 paise) via UPI
    const settlements: SettlementInput[] = [
      {
        payerMemberId: 'bob',
        payeeMemberId: 'alice',
        amount: 300000,
      },
    ];

    // Compute Net Balances
    const balances = calculateGroupBalances(memberIds, allExpenses, settlements);

    // Verify Invariant: Sum of net balances MUST be strictly zero!
    const netSum = Object.values(balances).reduce((sum, b) => sum + b.netBalance, 0);
    expect(netSum).toBe(0);

    // Verify Debt Simplification preserves zero-sum and satisfies all balances
    const simplifiedDebts = simplifyDebts(balances);

    // Each simplified payment moves money from a debtor to a creditor
    const simulatedBalancesAfterSimplified: Record<string, number> = {};
    for (const id of memberIds) {
      simulatedBalancesAfterSimplified[id] = balances[id].netBalance;
    }

    for (const debt of simplifiedDebts) {
      simulatedBalancesAfterSimplified[debt.fromMemberId] += debt.amount;
      simulatedBalancesAfterSimplified[debt.toMemberId] -= debt.amount;
    }

    // After all simplified debts are paid, everyone must be at 0!
    for (const id of memberIds) {
      expect(simulatedBalancesAfterSimplified[id]).toBe(0);
    }

    // Number of transactions in simplified debts should be strictly less than maximum possible pairwise transactions
    expect(simplifiedDebts.length).toBeLessThan(memberIds.length);
  });

  it('guarantees penny-perfect precision for 3-way split of 100 paise', () => {
    const splits = calculateSplits('equal', 100, [
      { memberId: 'm-1' },
      { memberId: 'm-2' },
      { memberId: 'm-3' },
    ]);

    expect(splits.reduce((sum, s) => sum + s.owedAmount, 0)).toBe(100);
    expect(splits.map((s) => s.owedAmount)).toEqual([34, 33, 33]);
  });
});
