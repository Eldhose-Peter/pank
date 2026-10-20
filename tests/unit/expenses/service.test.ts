import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExpenseService } from '@/modules/expenses/service';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

describe('ExpenseService', () => {
  let mockSupabase: Partial<SupabaseClient<Database>>;
  const userId = '123e4567-e89b-12d3-a456-426614174000';
  const groupId = '123e4567-e89b-12d3-a456-426614174001';
  const memberA = '123e4567-e89b-12d3-a456-426614174002';
  const memberB = '123e4567-e89b-12d3-a456-426614174003';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an equal split expense transactionally with calculated splits', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: { success: true, expenseId: 'exp-created-1', isDuplicate: false },
      error: null,
    });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'group_members') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: memberA },
                  error: null,
                }),
              }),
              in: vi.fn().mockResolvedValue({
                data: [{ id: memberA }, { id: memberB }],
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });

    mockSupabase = {
      from: mockFrom as unknown as SupabaseClient<Database>['from'],
      rpc: mockRpc as unknown as SupabaseClient<Database>['rpc'],
    };

    const service = new ExpenseService(mockSupabase as SupabaseClient<Database>);

    const result = await service.createExpense(userId, groupId, {
      title: 'Dinner at Taj',
      amount: 240000,
      splitType: 'equal',
      paidByMemberId: memberA,
      participants: [
        { groupMemberId: memberA },
        { groupMemberId: memberB },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.expenseId).toBe('exp-created-1');
    expect(mockRpc).toHaveBeenCalledWith('create_expense_transactional', expect.objectContaining({
      p_group_id: groupId,
      p_title: 'Dinner at Taj',
      p_amount: 240000,
      p_split_type: 'equal',
      p_payments: [{ group_member_id: memberA, amount_paid: 240000 }],
      p_splits: [
        { group_member_id: memberA, split_value: 1, owed_amount: 120000 },
        { group_member_id: memberB, split_value: 1, owed_amount: 120000 },
      ],
    }));
  });

  it('throws validation error if payments sum does not equal total amount', async () => {
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'group_members') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: memberA },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    mockSupabase = {
      from: mockFrom as unknown as SupabaseClient<Database>['from'],
      rpc: vi.fn() as unknown as SupabaseClient<Database>['rpc'],
    };

    const service = new ExpenseService(mockSupabase as SupabaseClient<Database>);

    // Total = 240000, but payers sum = 100000 + 100000 = 200000
    await expect(
      service.createExpense(userId, groupId, {
        title: 'Mismatched payments',
        amount: 240000,
        splitType: 'equal',
        payers: [
          { groupMemberId: memberA, amountPaid: 100000 },
          { groupMemberId: memberB, amountPaid: 100000 },
        ],
        participants: [{ groupMemberId: memberA }, { groupMemberId: memberB }],
      })
    ).rejects.toThrow(/Sum of payments/);
  });

  it('throws forbidden error if user is not a group member', async () => {
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'group_members') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null, // Not a member
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    mockSupabase = {
      from: mockFrom as unknown as SupabaseClient<Database>['from'],
      rpc: vi.fn() as unknown as SupabaseClient<Database>['rpc'],
    };

    const service = new ExpenseService(mockSupabase as SupabaseClient<Database>);

    await expect(
      service.createExpense(userId, groupId, {
        title: 'Unauthorized expense',
        amount: 10000,
        splitType: 'equal',
        paidByMemberId: memberA,
        participants: [{ groupMemberId: memberA }],
      })
    ).rejects.toThrow(/not a member/);
  });
});
