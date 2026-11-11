import type { MinorUnits, SplitType } from '@/modules/accounting/types';
import type { CreateExpenseDTO } from '@/modules/expenses/types';

export type DraftStatus =
  | 'pending_clarification'
  | 'ready_for_review'
  | 'confirmed'
  | 'rejected';

export interface ExtractedPayer {
  rawName: string;
  amount?: number; // In major currency units (e.g. 2400 for ₹2400) or minor units
}

export interface ExtractedParticipant {
  rawName: string;
  splitValue?: number; // exact amount, percentage, or shares
}

export interface ExtractedExpenseDraft {
  title: string;
  description?: string;
  amount: number; // in major units (e.g. 2400)
  currency: string;
  splitType: SplitType;
  expenseDate?: string;
  payers: ExtractedPayer[];
  participants: ExtractedParticipant[];
  clarificationNeeded: string[];
  confidence: number; // 0.0 to 1.0
  receiptUrl?: string | null;
  receiptItems?: { name: string; amount: number }[];
}

export interface ResolvedMember {
  groupMemberId: string;
  displayName: string;
  matchedName: string;
  confidence: number;
}

export interface UnresolvedName {
  rawName: string;
  suggestedMatches: {
    groupMemberId: string;
    displayName: string;
    similarity: number;
  }[];
}

export interface NameResolutionResult {
  resolvedPayers: {
    groupMemberId: string;
    amountPaid: MinorUnits;
  }[];
  resolvedParticipants: {
    groupMemberId: string;
    splitValue?: number;
  }[];
  unresolvedNames: UnresolvedName[];
  ambiguousMatches: {
    rawName: string;
    candidates: { groupMemberId: string; displayName: string }[];
  }[];
}

export interface ClarificationQuestion {
  id: string;
  type: 'unresolved_member' | 'missing_amount' | 'ambiguous_split' | 'missing_payer';
  question: string;
  rawName?: string;
  options?: { label: string; value: string }[];
}

export interface ExpenseDraftPreview {
  id: string;
  groupId: string;
  sessionId?: string | null;
  rawInput: string;
  status: DraftStatus;
  title: string;
  description?: string | null;
  amount: MinorUnits;
  currency: string;
  splitType: SplitType;
  expenseDate: string;
  payers: {
    groupMemberId: string;
    displayName: string;
    amountPaid: MinorUnits;
  }[];
  splits: {
    groupMemberId: string;
    displayName: string;
    splitValue: number;
    owedAmount: MinorUnits;
  }[];
  clarificationQuestions: ClarificationQuestion[];
  unresolvedNames: UnresolvedName[];
  receiptUrl?: string | null;
  receiptItems?: { name: string; amount: number }[];
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationSession {
  id: string;
  groupId: string;
  userId: string;
  status: 'active' | 'completed' | 'expired';
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
