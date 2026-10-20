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

/**
 * Calculates direct, unsimplified pairwise debts between members.
 * For each pair (A, B), computes net amount A owes B based on individual expenses and settlements.
 */
export function calculatePairwiseDebts(
  expenses: ExpenseRecord[],
  settlements: SettlementInput[] = []
): PairwiseDebt[] {
  // Key: `${from}->${to}`, value: debt amount
  const debtMatrix: Record<string, number> = {};

  const addDebt = (from: string, to: string, amount: number) => {
    if (from === to || amount === 0) return;
    const key = `${from}->${to}`;
    debtMatrix[key] = (debtMatrix[key] || 0) + amount;
  };

  for (const expense of expenses) {
    if (expense.isDeleted || expense.amount === 0) continue;

    const totalAmount = expense.amount;

    for (const split of expense.splits) {
      const splitMemberId = (split as { memberId?: string; groupMemberId?: string }).memberId ||
                            (split as { memberId?: string; groupMemberId?: string }).groupMemberId;
      if (!splitMemberId || split.owedAmount === 0) continue;

      for (const payment of expense.payments) {
        const payerId = (payment as { memberId?: string; groupMemberId?: string }).memberId ||
                        (payment as { memberId?: string; groupMemberId?: string }).groupMemberId;
        if (!payerId || payerId === splitMemberId || payment.amountPaid === 0) continue;

        // Proportional share covered by this payer
        const proportionPaid = payment.amountPaid / totalAmount;
        const portionOwed = Math.round(split.owedAmount * proportionPaid);
        addDebt(splitMemberId, payerId, portionOwed);
      }
    }
  }

  // Factor in settlements (payer pays payee directly reduces payer's debt to payee)
  for (const settlement of settlements) {
    // A paid settlement to B -> effectively reduces A's debt to B, or increases B's debt to A
    addDebt(settlement.payeeMemberId, settlement.payerMemberId, settlement.amount);
  }

  // Net out bilateral debts: if A owes B 50 and B owes A 30, net is A owes B 20
  const processedPairs = new Set<string>();
  const pairwiseDebts: PairwiseDebt[] = [];

  const allKeys = Object.keys(debtMatrix);
  for (const key of allKeys) {
    const [a, b] = key.split('->');
    const pairKey = [a, b].sort().join('<->');
    if (processedPairs.has(pairKey)) continue;
    processedPairs.add(pairKey);

    const aOwesB = debtMatrix[`${a}->${b}`] || 0;
    const bOwesA = debtMatrix[`${b}->${a}`] || 0;

    const net = aOwesB - bOwesA;
    if (net > 0) {
      pairwiseDebts.push({ fromMemberId: a, toMemberId: b, amount: net });
    } else if (net < 0) {
      pairwiseDebts.push({ fromMemberId: b, toMemberId: a, amount: Math.abs(net) });
    }
  }

  return pairwiseDebts;
}
