import { describe, it, expect, vi } from 'vitest';
import { GroupService } from '@/modules/groups/service';
import { ExpenseService } from '@/modules/expenses/service';
import { SettlementService } from '@/modules/settlements/service';
import { DraftService } from '@/modules/ai/draft-service';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

describe('Phase 4: Authorization & Membership Guards', () => {
  const nonMemberUserId = '00000000-0000-0000-0000-000000000999';
  const targetGroupId = '123e4567-e89b-12d3-a456-426614174001';

  // Mock Supabase client returning null for group_members lookup (simulating non-member)
  const createMockNonMemberSupabase = () => {
    return {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'group_members') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          };
        }
        return {};
      }),
      rpc: vi.fn(),
    } as unknown as SupabaseClient<Database>;
  };

  it('rejects non-member from viewing group details', async () => {
    const supabase = createMockNonMemberSupabase();
    const service = new GroupService(supabase);

    await expect(
      service.getGroupWithMembers(nonMemberUserId, targetGroupId)
    ).rejects.toThrow(/not a member/i);
  });

  it('rejects non-member from creating expenses in group', async () => {
    const supabase = createMockNonMemberSupabase();
    const service = new ExpenseService(supabase);

    await expect(
      service.createExpense(nonMemberUserId, targetGroupId, {
        title: 'Hacked Expense',
        amount: 10000,
        splitType: 'equal',
        paidByMemberId: '123e4567-e89b-12d3-a456-426614174002',
        participants: [{ groupMemberId: '123e4567-e89b-12d3-a456-426614174002' }],
      })
    ).rejects.toThrow(/not a member/i);
  });

  it('rejects non-member from listing group expenses', async () => {
    const supabase = createMockNonMemberSupabase();
    const service = new ExpenseService(supabase);

    await expect(
      service.getExpenses(nonMemberUserId, targetGroupId)
    ).rejects.toThrow(/not a member/i);
  });

  it('rejects non-member from recording settlements', async () => {
    const supabase = createMockNonMemberSupabase();
    const service = new SettlementService(supabase);

    await expect(
      service.recordSettlement(nonMemberUserId, targetGroupId, {
        payerMemberId: '123e4567-e89b-12d3-a456-426614174002',
        payeeMemberId: '123e4567-e89b-12d3-a456-426614174003',
        amount: 5000,
      })
    ).rejects.toThrow(/not a member/i);
  });

  it('rejects non-member from parsing natural language drafts', async () => {
    const supabase = createMockNonMemberSupabase();
    const service = new DraftService(supabase);

    await expect(
      service.parseExpenseInput(nonMemberUserId, targetGroupId, 'I paid 500 for lunch')
    ).rejects.toThrow(/not a member/i);
  });
});
