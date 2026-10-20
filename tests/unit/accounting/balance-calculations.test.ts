import { describe, it, expect } from 'vitest';
import {
  calculateGroupBalances,
  simplifyDebts,
} from '@/modules/accounting/balances';
import type { ExpenseRecord, SettlementInput } from '@/modules/accounting/types';

describe('Accounting: Balances & Debt Simplification', () => {
  it('correctly calculates net balances for a single expense and ensures zero-sum invariant', () => {
    // Alice paid ₹2,400 for dinner split equally between Alice, Bob, Charlie, Dave
    const memberIds = ['alice', 'bob', 'charlie', 'dave'];
    const expenses: ExpenseRecord[] = [
      {
        id: 'exp-1',
        amount: 240000,
        payments: [{ memberId: 'alice', amountPaid: 240000 }],
        splits: [
          { memberId: 'alice', splitValue: 1, owedAmount: 60000 },
          { memberId: 'bob', splitValue: 1, owedAmount: 60000 },
          { memberId: 'charlie', splitValue: 1, owedAmount: 60000 },
          { memberId: 'dave', splitValue: 1, owedAmount: 60000 },
        ],
      },
    ];

    const balances = calculateGroupBalances(memberIds, expenses);

    // Alice paid 240000 and owes 60000 -> net = +180000
    expect(balances['alice'].netBalance).toBe(180000);
    // Bob owes 60000 -> net = -60000
    expect(balances['bob'].netBalance).toBe(-60000);
    expect(balances['charlie'].netBalance).toBe(-60000);
    expect(balances['dave'].netBalance).toBe(-60000);

    // Zero-sum invariant: sum of net balances must be strictly 0
    const totalNet = Object.values(balances).reduce(
      (sum, b) => sum + b.netBalance,
      0
    );
    expect(totalNet).toBe(0);
  });

  it('incorporates settlements into net balances correctly', () => {
    const memberIds = ['alice', 'bob'];
    const expenses: ExpenseRecord[] = [
      {
        id: 'exp-1',
        amount: 10000,
        payments: [{ memberId: 'alice', amountPaid: 10000 }],
        splits: [
          { memberId: 'alice', splitValue: 1, owedAmount: 5000 },
          { memberId: 'bob', splitValue: 1, owedAmount: 5000 },
        ],
      },
    ];

    // Bob settles ₹50 (5000 paise) to Alice
    const settlements: SettlementInput[] = [
      {
        payerMemberId: 'bob',
        payeeMemberId: 'alice',
        amount: 5000,
      },
    ];

    const balances = calculateGroupBalances(memberIds, expenses, settlements);

    // Alice: paid 10000, owed 5000, received settlement 5000 -> net = 10000 - 5000 - 5000 = 0
    expect(balances['alice'].netBalance).toBe(0);
    // Bob: paid 0, owed 5000, paid settlement 5000 -> net = 0 - 5000 + 5000 = 0
    expect(balances['bob'].netBalance).toBe(0);
  });

  it('simplifies debts minimizing transaction count', () => {
    // A owes B ₹100, B owes C ₹100
    // Simplified: A owes C ₹100 directly (1 transaction instead of 2)
    const balances = {
      userA: {
        memberId: 'userA',
        totalPaid: 0,
        totalOwed: 10000,
        totalSettledPaid: 0,
        totalSettledReceived: 0,
        netBalance: -10000,
      },
      userB: {
        memberId: 'userB',
        totalPaid: 10000,
        totalOwed: 10000,
        totalSettledPaid: 0,
        totalSettledReceived: 0,
        netBalance: 0,
      },
      userC: {
        memberId: 'userC',
        totalPaid: 10000,
        totalOwed: 0,
        totalSettledPaid: 0,
        totalSettledReceived: 0,
        netBalance: 10000,
      },
    };

    const debts = simplifyDebts(balances);

    expect(debts).toHaveLength(1);
    expect(debts[0]).toEqual({
      fromMemberId: 'userA',
      toMemberId: 'userC',
      amount: 10000,
    });
  });
});
