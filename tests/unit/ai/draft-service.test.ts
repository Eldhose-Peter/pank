import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DraftService } from '@/modules/ai/draft-service';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

describe('AI: DraftService', () => {
  let mockSupabase: Partial<SupabaseClient<Database>>;
  const userId = '123e4567-e89b-12d3-a456-426614174000';
  const groupId = '123e4567-e89b-12d3-a456-426614174001';

  const memberMe = { id: 'm-me', user_id: userId, display_name: 'Eldho', is_placeholder: false };
  const memberRahul = { id: 'm-rahul', user_id: 'u-rahul', display_name: 'Rahul', is_placeholder: false };
  const memberPriya = { id: 'm-priya', user_id: 'u-priya', display_name: 'Priya', is_placeholder: false };
  const memberArjun = { id: 'm-arjun', user_id: 'u-arjun', display_name: 'Arjun', is_placeholder: false };

  const allMembers = [memberMe, memberRahul, memberPriya, memberArjun];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses "I paid ₹2,400 for dinner. Split it equally between me, Rahul, Priya and Arjun." into ready_for_review draft with deterministic shares', async () => {
    let insertedDraft: any = null;

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'group_members') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation((col: string, val: string) => {
              if (col === 'group_id') {
                return {
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: memberMe,
                      error: null,
                    }),
                  }),
                  // for all members query
                  then: (resolve: any) => resolve({ data: allMembers, error: null }),
                };
              }
              return { maybeSingle: vi.fn().mockResolvedValue({ data: memberMe, error: null }) };
            }),
          }),
        };
      }
      if (table === 'groups') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { currency: 'INR' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'expense_drafts') {
        return {
          insert: vi.fn().mockImplementation((record: any) => {
            insertedDraft = {
              id: 'draft-123',
              ...record,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 7200000).toISOString(),
            };
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: insertedDraft, error: null }),
              }),
            };
          }),
        };
      }
      return {};
    });

    mockSupabase = {
      from: mockFrom as unknown as SupabaseClient<Database>['from'],
    };

    const service = new DraftService(mockSupabase as SupabaseClient<Database>);

    const input = 'I paid ₹2,400 for dinner. Split it equally between me, Rahul, Priya and Arjun.';
    const preview = await service.parseExpenseInput(userId, groupId, input);

    expect(preview.status).toBe('ready_for_review');
    expect(preview.amount).toBe(240000); // 2400 INR in paise
    expect(preview.title).toBe('Dinner');
    expect(preview.currency).toBe('INR');
    expect(preview.splitType).toBe('equal');

    // 4 participants each owing exactly 60000 paise (₹600)
    expect(preview.splits).toHaveLength(4);
    for (const split of preview.splits) {
      expect(split.owedAmount).toBe(60000);
    }

    // Payer is me for 240000 paise
    expect(preview.payers).toHaveLength(1);
    expect(preview.payers[0].groupMemberId).toBe('m-me');
    expect(preview.payers[0].amountPaid).toBe(240000);

    expect(preview.clarificationQuestions).toHaveLength(0);
  });

  it('sets status to pending_clarification when unknown person is named', async () => {
    let insertedDraft: any = null;

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'group_members') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation((col: string) => {
              if (col === 'group_id') {
                return {
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: memberMe, error: null }),
                  }),
                  then: (resolve: any) => resolve({ data: allMembers, error: null }),
                };
              }
              return { maybeSingle: vi.fn().mockResolvedValue({ data: memberMe, error: null }) };
            }),
          }),
        };
      }
      if (table === 'groups') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { currency: 'INR' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'expense_drafts') {
        return {
          insert: vi.fn().mockImplementation((record: any) => {
            insertedDraft = {
              id: 'draft-unknown',
              ...record,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              expires_at: new Date().toISOString(),
            };
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: insertedDraft, error: null }),
              }),
            };
          }),
        };
      }
      return {};
    });

    mockSupabase = {
      from: mockFrom as unknown as SupabaseClient<Database>['from'],
    };

    const service = new DraftService(mockSupabase as SupabaseClient<Database>);

    // "Zara" is not a member of the group
    const input = 'I paid ₹1,000 for coffee with Zara';
    const preview = await service.parseExpenseInput(userId, groupId, input);

    expect(preview.status).toBe('pending_clarification');
    expect(preview.clarificationQuestions.length).toBeGreaterThan(0);
    const question = preview.clarificationQuestions.find((q) => q.type === 'unresolved_member');
    expect(question).toBeDefined();
    expect(question?.rawName).toBe('Zara');
  });

  it('handles exact split refinement with decimal values (e.g. 223.33) without throwing or creating unanswerable clarification questions', async () => {
    const existingDraftRecord = {
      id: 'draft-bill-1',
      group_id: groupId,
      created_by: userId,
      session_id: null,
      status: 'ready_for_review',
      title: 'Hotel Seagull',
      amount: 384000, // 3840.00 INR in paise
      currency: 'INR',
      split_type: 'equal',
      expense_date: '2026-11-13',
      structured_data: {
        title: 'Hotel Seagull',
        amount: 384000,
        currency: 'INR',
        splitType: 'equal',
        expenseDate: '2026-11-13',
        payers: [{ groupMemberId: 'm-me', displayName: 'Eldho', amountPaid: 384000 }],
        splits: [
          { groupMemberId: 'm-me', displayName: 'Eldho', splitValue: 1, owedAmount: 192000 },
          { groupMemberId: 'm-rahul', displayName: 'Rahul', splitValue: 1, owedAmount: 192000 },
        ],
        receiptItems: [
          { name: 'Porotta', amount: 450 },
          { name: 'Prawns Roast', amount: 400 },
          { name: 'Budweiser Magnum', amount: 370 },
        ],
      },
      clarification_needed: [],
      receipt_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expires_at: new Date().toISOString(),
    };

    let updatedDraftRecord = { ...existingDraftRecord };

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'group_members') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation((col: string) => {
              if (col === 'group_id') {
                return {
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: memberMe, error: null }),
                  }),
                  then: (resolve: any) => resolve({ data: allMembers, error: null }),
                };
              }
              return { maybeSingle: vi.fn().mockResolvedValue({ data: memberMe, error: null }) };
            }),
          }),
        };
      }
      if (table === 'expense_drafts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: existingDraftRecord, error: null }),
                maybeSingle: vi.fn().mockResolvedValue({ data: existingDraftRecord, error: null }),
              }),
            }),
          }),
          update: vi.fn().mockImplementation((updates: any) => {
            updatedDraftRecord = { ...updatedDraftRecord, ...updates };
            const selectChain = {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: updatedDraftRecord, error: null }),
              }),
            };
            return {
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue(selectChain),
                ...selectChain,
              }),
            };
          }),
        };
      }
      return {};
    });

    mockSupabase = {
      from: mockFrom as unknown as SupabaseClient<Database>['from'],
    };

    const service = new DraftService(mockSupabase as SupabaseClient<Database>);

    // Mock gemini.refineExpenseDraft to return an exact split with float amounts (e.g. 223.33)
    vi.spyOn((service as any).gemini, 'refineExpenseDraft').mockResolvedValue({
      title: 'Hotel Seagull',
      amount: 3840,
      currency: 'INR',
      splitType: 'exact',
      expenseDate: '2026-11-13',
      payers: [{ rawName: 'me', amount: 3840 }],
      participants: [
        { rawName: 'Rahul', splitValue: 223.33 },
        { rawName: 'me', splitValue: 3616.67 },
      ],
      receiptItems: existingDraftRecord.structured_data.receiptItems,
    });

    const result = await service.refineDraft(userId, groupId, 'draft-bill-1', 'Rahul only had drinks');

    expect(result.status).toBe('ready_for_review');
    expect(result.splitType).toBe('exact');
    expect(result.clarificationQuestions).toHaveLength(0);

    // Minor units sum must equal exact total: 384000 paise
    const totalOwed = result.splits.reduce((acc, s) => acc + s.owedAmount, 0);
    expect(totalOwed).toBe(384000);

    const rahulSplit = result.splits.find((s) => s.groupMemberId === 'm-rahul');
    expect(rahulSplit).toBeDefined();
    expect(rahulSplit?.owedAmount).toBe(22333); // 223.33 INR converted to 22333 paise
  });
});
