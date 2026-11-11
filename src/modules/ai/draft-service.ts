import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { GeminiAIClient } from './gemini-client';
import { MemberResolver, type GroupMemberCandidate } from './member-resolver';
import type {
  ExpenseDraftPreview,
  ClarificationQuestion,
  DraftStatus,
  ExtractedExpenseDraft,
} from './types';
import { calculateSplits } from '@/modules/accounting/calculations';
import { ExpenseService } from '@/modules/expenses/service';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
  GroupError,
} from '@/modules/groups/errors';

export class DraftService {
  private gemini: GeminiAIClient;

  constructor(private supabase: SupabaseClient<Database>) {
    this.gemini = new GeminiAIClient();
  }

  /**
   * Parses natural language input into a structured draft with member resolution and deterministic splits.
   */
  async parseExpenseInput(
    userId: string,
    groupId: string,
    rawInput: string,
    sessionId?: string,
    receiptUrl?: string
  ): Promise<ExpenseDraftPreview> {
    // 1. Verify caller membership & get current member info
    const currentMember = await this.getCurrentGroupMember(userId, groupId);

    // 2. Fetch all members in the group
    const { data: members, error: membersError } = await this.supabase
      .from('group_members')
      .select('id, user_id, display_name, is_placeholder')
      .eq('group_id', groupId);

    if (membersError || !members) {
      throw new GroupError('Failed to fetch group members');
    }

    const memberCandidates: GroupMemberCandidate[] = members.map((m) => ({
      id: m.id,
      displayName: m.display_name,
      userId: m.user_id,
      isCurrentUser: m.id === currentMember.id,
    }));

    // 3. Fetch group default currency
    const { data: group } = await this.supabase
      .from('groups')
      .select('currency')
      .eq('id', groupId)
      .single();

    const defaultCurrency = group?.currency || 'INR';

    // 4. Fetch conversation context if sessionId provided
    let conversationHistory: { role: string; content: string }[] = [];
    if (sessionId) {
      const { data: messages } = await this.supabase
        .from('conversation_messages')
        .select('role, content')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(10);

      conversationHistory = (messages || []).map((m) => ({
        role: m.role,
        content: m.content,
      }));
    }

    // 5. Extract structured data via Gemini
    const extracted = await this.gemini.extractExpense(
      rawInput,
      memberCandidates.map((m) => ({
        id: m.id,
        displayName: m.displayName,
        isCurrentUser: m.isCurrentUser,
      })),
      defaultCurrency,
      conversationHistory
    );

    return this.processExtractedDraft(
      userId,
      groupId,
      rawInput,
      extracted,
      members,
      currentMember,
      sessionId,
      receiptUrl
    );
  }

  /**
   * Processes any extracted draft into a saved draft preview with member resolution & split calculation.
   */
  async processExtractedDraft(
    userId: string,
    groupId: string,
    rawInput: string,
    extracted: ExtractedExpenseDraft,
    members: { id: string; user_id: string | null; display_name: string; is_placeholder: boolean }[],
    currentMember: { id: string; display_name: string },
    sessionId?: string,
    receiptUrl?: string
  ): Promise<ExpenseDraftPreview> {
    const memberCandidates: GroupMemberCandidate[] = members.map((m) => ({
      id: m.id,
      displayName: m.display_name,
      userId: m.user_id,
      isCurrentUser: m.id === currentMember.id,
    }));

    // Minor units conversion (e.g. ₹2,400 -> 240000 paise)
    const amountMinor = Math.round(extracted.amount * 100);

    // Resolve participant and payer names
    const resolution = MemberResolver.resolveMembers(
      extracted.payers,
      extracted.participants,
      memberCandidates,
      currentMember.id,
      100
    );

    // Generate Clarification Questions if needed
    const clarificationQuestions: ClarificationQuestion[] = [];

    if (amountMinor <= 0) {
      clarificationQuestions.push({
        id: 'q-amount',
        type: 'missing_amount',
        question: 'How much was the total expense amount?',
      });
    }

    for (const unresolved of resolution.unresolvedNames) {
      clarificationQuestions.push({
        id: `q-unresolved-${unresolved.rawName}`,
        type: 'unresolved_member',
        question: `Who is "${unresolved.rawName}"? Choose a group member or add them as a new member:`,
        rawName: unresolved.rawName,
        options: [
          ...unresolved.suggestedMatches.map((m) => ({
            label: m.displayName,
            value: m.groupMemberId,
          })),
          { label: `Add "${unresolved.rawName}" as a new friend`, value: `create_placeholder:${unresolved.rawName}` },
        ],
      });
    }

    for (const ambig of resolution.ambiguousMatches) {
      clarificationQuestions.push({
        id: `q-ambig-${ambig.rawName}`,
        type: 'unresolved_member',
        question: `Multiple members match "${ambig.rawName}". Which one did you mean?`,
        rawName: ambig.rawName,
        options: ambig.candidates.map((c) => ({
          label: c.displayName,
          value: c.groupMemberId,
        })),
      });
    }

    if (resolution.resolvedParticipants.length === 0 && resolution.unresolvedNames.length === 0) {
      clarificationQuestions.push({
        id: 'q-participants',
        type: 'ambiguous_split',
        question: 'Who should this expense be split between?',
        options: members.map((m) => ({
          label: m.display_name,
          value: m.id,
        })),
      });
    }

    // Determine Draft Status & Calculate Splits if resolved
    let status: DraftStatus = clarificationQuestions.length > 0 ? 'pending_clarification' : 'ready_for_review';
    let computedSplits: {
      groupMemberId: string;
      displayName: string;
      splitValue: number;
      owedAmount: number;
    }[] = [];

    const memberMap = new Map(members.map((m) => [m.id, m.display_name]));

    // If all participants resolved and amount > 0, compute splits deterministically
    if (status === 'ready_for_review' && resolution.resolvedParticipants.length > 0 && amountMinor > 0) {
      try {
        const splits = calculateSplits(
          extracted.splitType,
          amountMinor,
          resolution.resolvedParticipants.map((p) => ({
            memberId: p.groupMemberId,
            splitValue: p.splitValue,
          }))
        );

        computedSplits = splits.map((s) => ({
          groupMemberId: s.memberId,
          displayName: memberMap.get(s.memberId) || 'Unknown',
          splitValue: s.splitValue,
          owedAmount: s.owedAmount,
        }));
      } catch (calcError) {
        status = 'pending_clarification';
        clarificationQuestions.push({
          id: 'q-calc-error',
          type: 'ambiguous_split',
          question: (calcError as Error).message || 'Split calculation requires adjustment.',
        });
      }
    }

    // If payers resolved, ensure payer covers total
    const payersList = resolution.resolvedPayers.length > 0
      ? resolution.resolvedPayers.map((p) => ({
          groupMemberId: p.groupMemberId,
          displayName: memberMap.get(p.groupMemberId) || 'Unknown',
          amountPaid: p.amountPaid > 0 ? p.amountPaid : amountMinor,
        }))
      : [{
          groupMemberId: currentMember.id,
          displayName: currentMember.display_name,
          amountPaid: amountMinor,
        }];

    // Persist Draft in database
    const draftStructuredData = {
      title: extracted.title,
      description: extracted.description || null,
      amount: amountMinor,
      currency: extracted.currency,
      splitType: extracted.splitType,
      expenseDate: extracted.expenseDate,
      payers: payersList,
      splits: computedSplits,
      unresolvedNames: resolution.unresolvedNames,
      receiptUrl: receiptUrl || null,
      receiptItems: extracted.receiptItems || [],
    };

    const { data: draftRecord, error: draftError } = await this.supabase
      .from('expense_drafts')
      .insert({
        group_id: groupId,
        session_id: sessionId || null,
        created_by: userId,
        raw_input: rawInput,
        structured_data: draftStructuredData as any,
        status,
        clarification_questions: clarificationQuestions as unknown as Database['public']['Tables']['expense_drafts']['Insert']['clarification_questions'],
      })
      .select()
      .single();

    if (draftError || !draftRecord) {
      throw new GroupError(draftError?.message || 'Failed to save expense draft');
    }

    // Record conversation messages if in a session
    if (sessionId) {
      await this.supabase.from('conversation_messages').insert([
        {
          session_id: sessionId,
          role: 'user',
          content: rawInput,
        },
        {
          session_id: sessionId,
          role: 'assistant',
          content: status === 'ready_for_review'
            ? `I extracted: "${extracted.title}" for ${extracted.currency} ${(amountMinor / 100).toFixed(2)}. Please review individual shares before saving.`
            : `I drafted the expense but need clarification on: ${clarificationQuestions.map((q) => q.question).join(' ')}`,
          metadata: { draftId: draftRecord.id, status },
        },
      ]);
    }

    return {
      id: draftRecord.id,
      groupId: draftRecord.group_id,
      sessionId: draftRecord.session_id,
      rawInput: draftRecord.raw_input,
      status: draftRecord.status,
      title: extracted.title,
      description: extracted.description || null,
      amount: amountMinor,
      currency: extracted.currency,
      splitType: extracted.splitType,
      expenseDate: extracted.expenseDate || new Date().toISOString().split('T')[0],
      payers: payersList,
      splits: computedSplits,
      clarificationQuestions,
      unresolvedNames: resolution.unresolvedNames,
      receiptUrl: receiptUrl || null,
      receiptItems: extracted.receiptItems || [],
      expiresAt: draftRecord.expires_at,
      createdAt: draftRecord.created_at,
      updatedAt: draftRecord.updated_at,
    };
  }

  /**
   * Retrieves an existing expense draft preview.
   */
  async getDraft(
    userId: string,
    groupId: string,
    draftId: string
  ): Promise<ExpenseDraftPreview> {
    await this.getCurrentGroupMember(userId, groupId);

    const { data: draft, error } = await this.supabase
      .from('expense_drafts')
      .select('*')
      .eq('id', draftId)
      .eq('group_id', groupId)
      .single();

    if (error || !draft) {
      throw new NotFoundError('Expense draft not found');
    }

    const structured = draft.structured_data as {
      title: string;
      description?: string | null;
      amount: number;
      currency: string;
      splitType: 'equal' | 'exact' | 'percentage' | 'shares';
      expenseDate: string;
      payers: { groupMemberId: string; displayName: string; amountPaid: number }[];
      splits: { groupMemberId: string; displayName: string; splitValue: number; owedAmount: number }[];
      unresolvedNames?: { rawName: string; suggestedMatches: [] }[];
      receiptUrl?: string | null;
      receiptItems?: { name: string; amount: number }[];
    };

    return {
      id: draft.id,
      groupId: draft.group_id,
      sessionId: draft.session_id,
      rawInput: draft.raw_input,
      status: draft.status,
      title: structured.title,
      description: structured.description || null,
      amount: structured.amount,
      currency: structured.currency,
      splitType: structured.splitType,
      expenseDate: structured.expenseDate,
      payers: structured.payers || [],
      splits: structured.splits || [],
      clarificationQuestions: (draft.clarification_questions as unknown as ClarificationQuestion[]) || [],
      unresolvedNames: (structured.unresolvedNames as unknown as ExpenseDraftPreview['unresolvedNames']) || [],
      receiptUrl: draft.receipt_url || structured.receiptUrl || null,
      receiptItems: structured.receiptItems || [],
      expiresAt: draft.expires_at,
      createdAt: draft.created_at,
      updatedAt: draft.updated_at,
    };
  }

  /**
   * Updates an editable draft (resolving clarification answers, modifying amounts or splits).
   */
  async updateDraft(
    userId: string,
    groupId: string,
    draftId: string,
    updates: {
      title?: string;
      description?: string;
      amount?: number;
      splitType?: 'equal' | 'exact' | 'percentage' | 'shares';
      expenseDate?: string;
      payers?: { groupMemberId: string; amountPaid: number }[];
      participants?: { groupMemberId: string; splitValue?: number }[];
      resolvedPlaceholders?: { rawName: string; groupMemberId: string }[];
    }
  ): Promise<ExpenseDraftPreview> {
    const existing = await this.getDraft(userId, groupId, draftId);

    if (existing.status === 'confirmed') {
      throw new ValidationError('Confirmed drafts cannot be modified');
    }

    const newAmount = updates.amount !== undefined ? updates.amount : existing.amount;
    const newSplitType = updates.splitType || existing.splitType;
    const newTitle = updates.title || existing.title;
    const newDescription = updates.description !== undefined ? updates.description : existing.description;
    const newDate = updates.expenseDate || existing.expenseDate;

    // Fetch group members for display names
    const { data: members } = await this.supabase
      .from('group_members')
      .select('id, display_name')
      .eq('group_id', groupId);

    const memberMap = new Map((members || []).map((m) => [m.id, m.display_name]));

    // Determine participants
    const participantList = updates.participants
      ? updates.participants
      : existing.splits.map((s) => ({ groupMemberId: s.groupMemberId, splitValue: s.splitValue }));

    // Recompute splits
    let computedSplits: {
      groupMemberId: string;
      displayName: string;
      splitValue: number;
      owedAmount: number;
    }[] = [];

    const clarificationQuestions: ClarificationQuestion[] = [];

    if (participantList.length > 0 && newAmount > 0) {
      try {
        const splits = calculateSplits(
          newSplitType,
          newAmount,
          participantList.map((p) => ({ memberId: p.groupMemberId, splitValue: p.splitValue }))
        );

        computedSplits = splits.map((s) => ({
          groupMemberId: s.memberId,
          displayName: memberMap.get(s.memberId) || 'Unknown',
          splitValue: s.splitValue,
          owedAmount: s.owedAmount,
        }));
      } catch (err) {
        clarificationQuestions.push({
          id: 'q-calc-error',
          type: 'ambiguous_split',
          question: (err as Error).message,
        });
      }
    } else {
      clarificationQuestions.push({
        id: 'q-missing-info',
        type: 'missing_amount',
        question: 'Amount and at least one participant are required.',
      });
    }

    // Determine payers
    const payersList = updates.payers
      ? updates.payers.map((p) => ({
          groupMemberId: p.groupMemberId,
          displayName: memberMap.get(p.groupMemberId) || 'Unknown',
          amountPaid: p.amountPaid,
        }))
      : existing.payers;

    const newStatus: DraftStatus = clarificationQuestions.length === 0 ? 'ready_for_review' : 'pending_clarification';

    const updatedStructuredData = {
      title: newTitle,
      description: newDescription,
      amount: newAmount,
      currency: existing.currency,
      splitType: newSplitType,
      expenseDate: newDate,
      payers: payersList,
      splits: computedSplits,
      unresolvedNames: [],
      receiptUrl: existing.receiptUrl || null,
      receiptItems: existing.receiptItems || [],
    };

    const { data: updatedRecord, error } = await this.supabase
      .from('expense_drafts')
      .update({
        structured_data: updatedStructuredData as any,
        status: newStatus,
        clarification_questions: clarificationQuestions as unknown as Database['public']['Tables']['expense_drafts']['Update']['clarification_questions'],
        updated_at: new Date().toISOString(),
      })
      .eq('id', draftId)
      .eq('group_id', groupId)
      .select()
      .single();

    if (error || !updatedRecord) {
      throw new GroupError(error?.message || 'Failed to update expense draft');
    }

    return {
      id: updatedRecord.id,
      groupId: updatedRecord.group_id,
      sessionId: updatedRecord.session_id,
      rawInput: updatedRecord.raw_input,
      status: updatedRecord.status,
      title: newTitle,
      description: newDescription,
      amount: newAmount,
      currency: existing.currency,
      splitType: newSplitType,
      expenseDate: newDate,
      payers: payersList,
      splits: computedSplits,
      clarificationQuestions,
      unresolvedNames: [],
      receiptUrl: existing.receiptUrl || null,
      receiptItems: existing.receiptItems || [],
      expiresAt: updatedRecord.expires_at,
      createdAt: updatedRecord.created_at,
      updatedAt: updatedRecord.updated_at,
    };
  }

  /**
   * Confirms a draft explicitly and writes the authoritative expense record.
   * Uses draftId as the idempotencyKey to guarantee exactly-once persistence.
   */
  async confirmDraft(
    userId: string,
    groupId: string,
    draftId: string
  ): Promise<{ success: boolean; expenseId: string }> {
    const draft = await this.getDraft(userId, groupId, draftId);

    if (draft.status === 'confirmed') {
      throw new ValidationError('This draft has already been confirmed and saved');
    }

    if (draft.status !== 'ready_for_review') {
      throw new ValidationError(
        'Cannot confirm draft until all clarifications are resolved and status is ready_for_review'
      );
    }

    const expenseService = new ExpenseService(this.supabase);

    // Save authoritative expense with draftId as idempotency key
    const result = await expenseService.createExpense(userId, groupId, {
      title: draft.title,
      description: draft.description || undefined,
      amount: draft.amount,
      currency: draft.currency,
      splitType: draft.splitType,
      expenseDate: draft.expenseDate,
      idempotencyKey: draft.id,
      receiptUrl: draft.receiptUrl,
      payers: draft.payers.map((p) => ({
        groupMemberId: p.groupMemberId,
        amountPaid: p.amountPaid,
      })),
      participants: draft.splits.map((s) => ({
        groupMemberId: s.groupMemberId,
        splitValue: s.splitValue,
      })),
    });

    // Mark draft as confirmed
    await this.supabase
      .from('expense_drafts')
      .update({
        status: 'confirmed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', draftId);

    return {
      success: true,
      expenseId: result.expenseId,
    };
  }

  /**
   * Rejects/cancels a draft.
   */
  async rejectDraft(
    userId: string,
    groupId: string,
    draftId: string
  ): Promise<void> {
    await this.getCurrentGroupMember(userId, groupId);

    const { error } = await this.supabase
      .from('expense_drafts')
      .update({
        status: 'rejected',
        updated_at: new Date().toISOString(),
      })
      .eq('id', draftId)
      .eq('group_id', groupId);

    if (error) {
      throw new GroupError(error.message);
    }
  }

  private async getCurrentGroupMember(
    userId: string,
    groupId: string
  ): Promise<{ id: string; display_name: string }> {
    const { data, error } = await this.supabase
      .from('group_members')
      .select('id, display_name')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      throw new ForbiddenError('You are not a member of this group');
    }

    return data;
  }
}
