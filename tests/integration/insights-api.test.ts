import { describe, it, expect, vi } from 'vitest';
import { InsightsService } from '@/modules/insights/service';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

describe('Insights Authorization & Security Guards', () => {
  const nonMemberUserId = '00000000-0000-0000-0000-000000000999';
  const targetGroupId = '123e4567-e89b-12d3-a456-426614174001';

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
    } as unknown as SupabaseClient<Database>;
  };

  it('strictly rejects non-member from fetching group spending insights with 403 Forbidden', async () => {
    const supabase = createMockNonMemberSupabase();
    const service = new InsightsService(supabase);

    await expect(
      service.getGroupInsights(nonMemberUserId, targetGroupId)
    ).rejects.toThrow(/not a member of this group/i);
  });

  it('safely handles user with zero groups without throwing errors', async () => {
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'group_members') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient<Database>;

    const service = new InsightsService(supabase);
    const result = await service.getOverallUserInsights(nonMemberUserId);

    expect(result.groupCount).toBe(0);
    expect(result.totalExpenseCount).toBe(0);
    expect(result.currencies).toEqual([]);
    expect(result.topPartners).toEqual([]);
    expect(result.aiSpendingBrief).toBeTruthy();
  });
});
