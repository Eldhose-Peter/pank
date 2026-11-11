import type { MinorUnits, SplitType } from '@/modules/accounting/types';

export interface ExpensePayment {
  id?: string;
  expenseId?: string;
  groupMemberId: string;
  amountPaid: MinorUnits;
}

export interface ExpenseSplit {
  id?: string;
  expenseId?: string;
  groupMemberId: string;
  splitValue: number;
  owedAmount: MinorUnits;
}

export interface ExpenseAuditLog {
  id: string;
  expenseId: string | null;
  groupId: string;
  action: 'created' | 'updated' | 'deleted' | 'restored';
  actorId: string;
  snapshotBefore: unknown | null;
  snapshotAfter: unknown | null;
  changeSummary: string | null;
  createdAt: string;
}

export interface Expense {
  id: string;
  groupId: string;
  title: string;
  description: string | null;
  amount: MinorUnits;
  currency: string;
  splitType: SplitType;
  expenseDate: string;
  createdBy: string;
  idempotencyKey: string | null;
  receiptUrl?: string | null;
  isDeleted: boolean;
  payments: ExpensePayment[];
  splits: ExpenseSplit[];
  createdAt: string;
  updatedAt: string;
}

export interface PayerInputDTO {
  groupMemberId: string;
  amountPaid: MinorUnits;
}

export interface ParticipantSplitInputDTO {
  groupMemberId: string;
  splitValue?: number;
}

export interface CreateExpenseDTO {
  title: string;
  description?: string;
  amount: MinorUnits;
  currency?: string;
  splitType: SplitType;
  expenseDate?: string;
  idempotencyKey?: string;
  receiptUrl?: string | null;
  /**
   * Multi-payer list. If only one person paid, you can provide either
   * `payers: [{ groupMemberId, amountPaid }]` or use `paidByMemberId`.
   */
  payers?: PayerInputDTO[];
  paidByMemberId?: string;
  participants: ParticipantSplitInputDTO[];
}

export interface UpdateExpenseDTO {
  title: string;
  description?: string;
  amount: MinorUnits;
  currency?: string;
  splitType: SplitType;
  expenseDate?: string;
  receiptUrl?: string | null;
  payers?: PayerInputDTO[];
  paidByMemberId?: string;
  participants: ParticipantSplitInputDTO[];
}

export interface ExpenseFilterOptions {
  limit?: number;
  offset?: number;
  memberId?: string;
  includeDeleted?: boolean;
}
