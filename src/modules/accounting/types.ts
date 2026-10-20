/**
 * Monetary amount in minor units (e.g., paise for INR, cents for USD).
 * Must be a safe non-negative integer.
 */
export type MinorUnits = number;

export type SplitType = 'equal' | 'exact' | 'percentage' | 'shares';

export interface ParticipantInput {
  memberId: string;
  /**
   * For 'equal': ignored
   * For 'exact': amount in minor units (paise)
   * For 'percentage': numeric percentage, e.g. 33.33
   * For 'shares': number of shares, e.g. 2
   */
  splitValue?: number;
}

export interface SplitResult {
  memberId: string;
  splitValue: number;
  owedAmount: MinorUnits;
}

export interface PayerInput {
  memberId: string;
  amountPaid: MinorUnits;
}

export interface MemberBalance {
  memberId: string;
  totalPaid: MinorUnits;
  totalOwed: MinorUnits;
  totalSettledPaid: MinorUnits;
  totalSettledReceived: MinorUnits;
  netBalance: MinorUnits; // positive = owed money (+), negative = owes money (-)
}

export interface PairwiseDebt {
  fromMemberId: string;
  toMemberId: string;
  amount: MinorUnits;
}

export interface SettlementInput {
  id?: string;
  payerMemberId: string;
  payeeMemberId: string;
  amount: MinorUnits;
}

export interface ExpenseRecord {
  id: string;
  amount: MinorUnits;
  payments: PayerInput[];
  splits: SplitResult[];
  isDeleted?: boolean;
}
