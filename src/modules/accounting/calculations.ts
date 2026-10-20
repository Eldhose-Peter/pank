import type {
  MinorUnits,
  SplitType,
  ParticipantInput,
  SplitResult,
  PayerInput,
} from './types';
import { distributeRemainder } from './rounding';

export class AccountingError extends Error {
  constructor(message: string, public code: string = 'ACCOUNTING_ERROR') {
    super(message);
    this.name = 'AccountingError';
  }
}

/**
 * Validates that the sum of payer contributions strictly equals the total expense amount.
 */
export function validatePayments(
  payments: PayerInput[],
  totalAmount: MinorUnits
): void {
  if (!payments || payments.length === 0) {
    throw new AccountingError('At least one payer is required', 'NO_PAYERS');
  }

  let totalPaid = 0;
  for (const p of payments) {
    if (!Number.isInteger(p.amountPaid) || p.amountPaid <= 0) {
      throw new AccountingError(
        `Invalid payment amount: ${p.amountPaid}. Must be a positive integer in minor units`,
        'INVALID_PAYMENT_AMOUNT'
      );
    }
    totalPaid += p.amountPaid;
  }

  if (totalPaid !== totalAmount) {
    throw new AccountingError(
      `Sum of payments (${totalPaid}) does not match total amount (${totalAmount})`,
      'PAYMENT_SUM_MISMATCH'
    );
  }
}

/**
 * Calculates splits for any supported split type with deterministic penny allocation.
 */
export function calculateSplits(
  splitType: SplitType,
  totalAmount: MinorUnits,
  participants: ParticipantInput[]
): SplitResult[] {
  if (!Number.isInteger(totalAmount) || totalAmount <= 0) {
    throw new AccountingError(
      `Total amount must be a positive integer in minor units, received ${totalAmount}`,
      'INVALID_TOTAL_AMOUNT'
    );
  }

  if (!participants || participants.length === 0) {
    throw new AccountingError(
      'At least one participant is required for expense split',
      'NO_PARTICIPANTS'
    );
  }

  // Ensure unique member IDs
  const memberIds = new Set<string>();
  for (const p of participants) {
    if (memberIds.has(p.memberId)) {
      throw new AccountingError(
        `Duplicate participant in split: ${p.memberId}`,
        'DUPLICATE_PARTICIPANT'
      );
    }
    memberIds.add(p.memberId);
  }

  switch (splitType) {
    case 'equal':
      return calculateEqualSplit(totalAmount, participants);
    case 'exact':
      return calculateExactSplit(totalAmount, participants);
    case 'percentage':
      return calculatePercentageSplit(totalAmount, participants);
    case 'shares':
      return calculateSharesSplit(totalAmount, participants);
    default:
      throw new AccountingError(`Unsupported split type: ${splitType}`, 'UNKNOWN_SPLIT_TYPE');
  }
}

/**
 * Equal split: divides totalAmount equally and deterministically distributes remainder paise.
 */
function calculateEqualSplit(
  totalAmount: MinorUnits,
  participants: ParticipantInput[]
): SplitResult[] {
  const count = participants.length;
  const items = participants.map((p) => ({ id: p.memberId }));
  const exactFraction = totalAmount / count;
  const fractions = participants.map(() => exactFraction);
  const baseAmounts = participants.map(() => Math.floor(exactFraction));

  const owedAmounts = distributeRemainder(items, fractions, baseAmounts, totalAmount);

  return participants.map((p, index) => ({
    memberId: p.memberId,
    splitValue: 1, // 1 equal share
    owedAmount: owedAmounts[index],
  }));
}

/**
 * Exact split: verifies that individual exact amounts sum to totalAmount.
 */
function calculateExactSplit(
  totalAmount: MinorUnits,
  participants: ParticipantInput[]
): SplitResult[] {
  let totalSum = 0;
  const results: SplitResult[] = [];

  for (const p of participants) {
    const val = p.splitValue ?? 0;
    if (!Number.isInteger(val) || val < 0) {
      throw new AccountingError(
        `Invalid exact split value for member ${p.memberId}: ${val}. Must be a non-negative integer`,
        'INVALID_SPLIT_VALUE'
      );
    }
    totalSum += val;
    results.push({
      memberId: p.memberId,
      splitValue: val,
      owedAmount: val,
    });
  }

  if (totalSum !== totalAmount) {
    throw new AccountingError(
      `Sum of exact splits (${totalSum}) does not equal total amount (${totalAmount})`,
      'EXACT_SPLIT_SUM_MISMATCH'
    );
  }

  return results;
}

/**
 * Percentage split: validates total percentage equals 100% and uses largest remainder.
 */
function calculatePercentageSplit(
  totalAmount: MinorUnits,
  participants: ParticipantInput[]
): SplitResult[] {
  let totalPercent = 0;
  for (const p of participants) {
    const pct = p.splitValue ?? 0;
    if (pct < 0) {
      throw new AccountingError(
        `Percentage cannot be negative: ${pct} for member ${p.memberId}`,
        'NEGATIVE_PERCENTAGE'
      );
    }
    totalPercent += pct;
  }

  // Allow floating point epsilon tolerance (e.g., 99.999% to 100.001%)
  if (Math.abs(totalPercent - 100) > 0.01) {
    throw new AccountingError(
      `Sum of percentages must equal 100%, got ${totalPercent.toFixed(2)}%`,
      'PERCENTAGE_SUM_MISMATCH'
    );
  }

  const items = participants.map((p) => ({ id: p.memberId }));
  const fractions = participants.map((p) => (totalAmount * (p.splitValue ?? 0)) / 100);
  const baseAmounts = fractions.map((f) => Math.floor(f));

  const owedAmounts = distributeRemainder(items, fractions, baseAmounts, totalAmount);

  return participants.map((p, index) => ({
    memberId: p.memberId,
    splitValue: p.splitValue ?? 0,
    owedAmount: owedAmounts[index],
  }));
}

/**
 * Shares split: divides according to integer/numeric share weights using largest remainder.
 */
function calculateSharesSplit(
  totalAmount: MinorUnits,
  participants: ParticipantInput[]
): SplitResult[] {
  let totalShares = 0;
  for (const p of participants) {
    const shares = p.splitValue ?? 0;
    if (shares <= 0) {
      throw new AccountingError(
        `Share count must be positive: ${shares} for member ${p.memberId}`,
        'INVALID_SHARES'
      );
    }
    totalShares += shares;
  }

  if (totalShares === 0) {
    throw new AccountingError('Total shares cannot be zero', 'ZERO_SHARES');
  }

  const items = participants.map((p) => ({ id: p.memberId }));
  const fractions = participants.map((p) => (totalAmount * (p.splitValue ?? 0)) / totalShares);
  const baseAmounts = fractions.map((f) => Math.floor(f));

  const owedAmounts = distributeRemainder(items, fractions, baseAmounts, totalAmount);

  return participants.map((p, index) => ({
    memberId: p.memberId,
    splitValue: p.splitValue ?? 0,
    owedAmount: owedAmounts[index],
  }));
}
