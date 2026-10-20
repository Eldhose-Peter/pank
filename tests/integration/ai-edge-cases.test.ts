import { describe, it, expect, vi } from 'vitest';
import { DraftService } from '@/modules/ai/draft-service';
import { GeminiAIClient } from '@/modules/ai/gemini-client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

describe('Phase 4: AI Edge Cases & State Machine', () => {
  const userId = '123e4567-e89b-12d3-a456-426614174000';
  const groupId = '123e4567-e89b-12d3-a456-426614174001';

  const memberMe = { id: 'm-me', user_id: userId, display_name: 'Eldho', is_placeholder: false };
  const memberRahul1 = { id: 'm-rahul-1', user_id: 'u-r1', display_name: 'Rahul Sharma', is_placeholder: false };
  const memberRahul2 = { id: 'm-rahul-2', user_id: 'u-r2', display_name: 'Rahul Verma', is_placeholder: false };
  const allMembers = [memberMe, memberRahul1, memberRahul2];

  it('detects ambiguous name when multiple members share the same first name', async () => {
    let savedDraft: any = null;

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
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
            insert: vi.fn().mockImplementation((rec: any) => {
              savedDraft = {
                id: 'draft-ambig-1',
                ...rec,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                expires_at: new Date().toISOString(),
              };
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: savedDraft, error: null }),
                }),
              };
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient<Database>;

    const service = new DraftService(mockSupabase);
    const preview = await service.parseExpenseInput(userId, groupId, 'I paid ₹500 for coffee with Rahul');

    expect(preview.status).toBe('pending_clarification');
    const ambigQuestion = preview.clarificationQuestions.find((q) => q.question.includes('Multiple members'));
    expect(ambigQuestion).toBeDefined();
    expect(ambigQuestion?.options).toHaveLength(2);
  });

  it('prevents double-confirmation of an already confirmed draft', async () => {
    const confirmedDraftRecord = {
      id: 'draft-already-confirmed',
      group_id: groupId,
      session_id: null,
      raw_input: 'test',
      status: 'confirmed', // Already confirmed!
      structured_data: {
        title: 'Lunch',
        amount: 50000,
        currency: 'INR',
        splitType: 'equal',
        expenseDate: '2026-10-20',
        payers: [{ groupMemberId: 'm-me', displayName: 'Eldho', amountPaid: 50000 }],
        splits: [{ groupMemberId: 'm-me', displayName: 'Eldho', splitValue: 1, owedAmount: 50000 }],
      },
      clarification_questions: [],
      expires_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'group_members') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: memberMe, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'expense_drafts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: confirmedDraftRecord, error: null }),
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient<Database>;

    const service = new DraftService(mockSupabase);

    await expect(
      service.confirmDraft(userId, groupId, 'draft-already-confirmed')
    ).rejects.toThrow(/already been confirmed/i);
  });

  it('parses diverse currency symbols and decimal formats cleanly', async () => {
    const gemini = new GeminiAIClient();
    const members = [{ id: 'm-me', displayName: 'Eldho', isCurrentUser: true }];

    const eurDraft = gemini.heuristicFallbackExtract('Paid 45.50 € for lunch with myself', members, 'EUR');
    expect(eurDraft.amount).toBe(45.5);
    expect(eurDraft.currency).toBe('EUR');

    const rsDraft = gemini.heuristicFallbackExtract('Rs 1250 spent on fuel', members, 'INR');
    expect(rsDraft.amount).toBe(1250);
    expect(rsDraft.currency).toBe('INR');
  });
});
