import type {
  MinorUnits,
  MemberBalance,
  PairwiseDebt,
  ExpenseRecord,
  SettlementInput,
} from './types';

/**
 * Calculates net balances for all members in a group from expenses and settlements.
 * Guarantee: Sum of net balances across all members is always 0.
 */
export function calculateGroupBalances(
  allMemberIds: string[],
  expenses: ExpenseRecord[],
  settlements: SettlementInput[] = []
): Record<string, MemberBalance> {
  const balances: Record<string, MemberBalance> = {};

  // Initialize all members with zero
  for (const memberId of allMemberIds) {
    balances[memberId] = {
      memberId,
      totalPaid: 0,
      totalOwed: 0,
      totalSettledPaid: 0,
      totalSettledReceived: 0,
      netBalance: 0,
    };
  }

  // Accumulate expense payments and splits
  for (const expense of expenses) {
    if (expense.isDeleted) continue;

    for (const payment of expense.payments) {
      const payerId = (payment as { memberId?: string; groupMemberId?: string }).memberId ||
                      (payment as { memberId?: string; groupMemberId?: string }).groupMemberId;
      if (!payerId) continue;

      if (!balances[payerId]) {
        balances[payerId] = {
          memberId: payerId,
          totalPaid: 0,
          totalOwed: 0,
          totalSettledPaid: 0,
          totalSettledReceived: 0,
          netBalance: 0,
        };
      }
      balances[payerId].totalPaid += payment.amountPaid;
    }

    for (const split of expense.splits) {
      const splitMemberId = (split as { memberId?: string; groupMemberId?: string }).memberId ||
                            (split as { memberId?: string; groupMemberId?: string }).groupMemberId;
      if (!splitMemberId) continue;

      if (!balances[splitMemberId]) {
        balances[splitMemberId] = {
          memberId: splitMemberId,
          totalPaid: 0,
          totalOwed: 0,
          totalSettledPaid: 0,
          totalSettledReceived: 0,
          netBalance: 0,
        };
      }
      balances[splitMemberId].totalOwed += split.owedAmount;
    }
  }

  // Accumulate settlements
  for (const settlement of settlements) {
    if (balances[settlement.payerMemberId]) {
      balances[settlement.payerMemberId].totalSettledPaid += settlement.amount;
    }
    if (balances[settlement.payeeMemberId]) {
      balances[settlement.payeeMemberId].totalSettledReceived += settlement.amount;
    }
  }

  // Compute final net balances
  for (const memberId of Object.keys(balances)) {
    const b = balances[memberId];
    b.netBalance =
      b.totalPaid - b.totalOwed + b.totalSettledPaid - b.totalSettledReceived;
  }

  return balances;
}

/**
 * Simplifies group debts using the greedy Min-Cash-Flow algorithm.
 * Minimizes total number of settlement transactions while preserving every member's exact net balance.
 */
export function simplifyDebts(
  balances: Record<string, MemberBalance>,
  currency: string = 'INR'
): PairwiseDebt[] {
  // Separate into debtors (net < 0) and creditors (net > 0)
  const debtors: { memberId: string; amount: MinorUnits }[] = [];
  const creditors: { memberId: string; amount: MinorUnits }[] = [];

  for (const b of Object.values(balances)) {
    if (b.netBalance < 0) {
      debtors.push({ memberId: b.memberId, amount: Math.abs(b.netBalance) });
    } else if (b.netBalance > 0) {
      creditors.push({ memberId: b.memberId, amount: b.netBalance });
    }
  }

  // Sort descending by amount to maximize greediness
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const debts: PairwiseDebt[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];

    const settleAmount = Math.min(debtor.amount, creditor.amount);

    if (settleAmount > 0) {
      debts.push({
        fromMemberId: debtor.memberId,
        toMemberId: creditor.memberId,
        amount: settleAmount,
      });

      debtor.amount -= settleAmount;
      creditor.amount -= settleAmount;
    }

    if (debtor.amount === 0) {
      debtorIndex++;
    }
    if (creditor.amount === 0) {
      creditorIndex++;
    }
  }

  return debts;
}
