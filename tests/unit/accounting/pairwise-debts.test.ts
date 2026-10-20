import { describe, it, expect } from 'vitest';
import { calculatePairwiseDebts } from '@/modules/accounting/balances';
import type { ExpenseRecord, SettlementInput } from '@/modules/accounting/types';

describe('Accounting: Direct Pairwise Debts', () => {
  it('calculates direct debt between 2 people with single payer', () => {
    // Alice paid ₹100 (10000 paise) split equally between Alice and Bob
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

    const debts = calculatePairwiseDebts(expenses);

    expect(debts).toHaveLength(1);
    expect(debts[0]).toEqual({
      fromMemberId: 'bob',
      toMemberId: 'alice',
      amount: 5000,
    });
  });

  it('nets bilateral debts between two members correctly', () => {
    // Expense 1: Alice paid ₹100, Bob owes ₹50
    // Expense 2: Bob paid ₹60, Alice owes ₹30
    // Net: Bob owes Alice ₹20 (50 - 30)
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
      {
        id: 'exp-2',
        amount: 6000,
        payments: [{ memberId: 'bob', amountPaid: 6000 }],
        splits: [
          { memberId: 'alice', splitValue: 1, owedAmount: 3000 },
          { memberId: 'bob', splitValue: 1, owedAmount: 3000 },
        ],
      },
    ];

    const debts = calculatePairwiseDebts(expenses);

    expect(debts).toHaveLength(1);
    expect(debts[0]).toEqual({
      fromMemberId: 'bob',
      toMemberId: 'alice',
      amount: 2000, // ₹20 net
    });
  });

  it('incorporates direct settlement to reduce pairwise debt to zero', () => {
    // Alice paid ₹100, Bob owes ₹50
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

    // Bob settles ₹50 to Alice
    const settlements: SettlementInput[] = [
      {
        payerMemberId: 'bob',
        payeeMemberId: 'alice',
        amount: 5000,
      },
    ];

    const debts = calculatePairwiseDebts(expenses, settlements);

    expect(debts).toHaveLength(0); // Fully settled
  });

  it('handles multi-payer expense with proportional debt distribution', () => {
    // Alice paid ₹60, Bob paid ₹40 for a ₹100 dinner
    // Charlie owes ₹50, Dave owes ₹50
    // Charlie owes Alice: 50 * (60/100) = 30
    // Charlie owes Bob: 50 * (40/100) = 20
    // Dave owes Alice: 50 * (60/100) = 30
    // Dave owes Bob: 50 * (40/100) = 20
    const expenses: ExpenseRecord[] = [
      {
        id: 'exp-multi',
        amount: 10000,
        payments: [
          { memberId: 'alice', amountPaid: 6000 },
          { memberId: 'bob', amountPaid: 4000 },
        ],
        splits: [
          { memberId: 'charlie', splitValue: 1, owedAmount: 5000 },
          { memberId: 'dave', splitValue: 1, owedAmount: 5000 },
        ],
      },
    ];

    const debts = calculatePairwiseDebts(expenses);

    expect(debts).toHaveLength(4);

    const charlieToAlice = debts.find((d) => d.fromMemberId === 'charlie' && d.toMemberId === 'alice');
    const charlieToBob = debts.find((d) => d.fromMemberId === 'charlie' && d.toMemberId === 'bob');
    const daveToAlice = debts.find((d) => d.fromMemberId === 'dave' && d.toMemberId === 'alice');
    const daveToBob = debts.find((d) => d.fromMemberId === 'dave' && d.toMemberId === 'bob');

    expect(charlieToAlice?.amount).toBe(3000);
    expect(charlieToBob?.amount).toBe(2000);
    expect(daveToAlice?.amount).toBe(3000);
    expect(daveToBob?.amount).toBe(2000);
  });
});
