import type { MinorUnits } from '@/modules/accounting/types';

export interface Settlement {
  id: string;
  groupId: string;
  payerMemberId: string;
  payeeMemberId: string;
  amount: MinorUnits;
  currency: string;
  paymentMethod: string | null;
  notes: string | null;
  settledAt: string;
  createdBy: string;
  isDeleted: boolean;
  createdAt: string;
}

export interface RecordSettlementDTO {
  payerMemberId: string;
  payeeMemberId: string;
  amount: MinorUnits;
  currency?: string;
  paymentMethod?: string;
  notes?: string;
  settledAt?: string;
}
