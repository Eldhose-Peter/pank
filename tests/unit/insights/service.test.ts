import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InsightsService } from '@/modules/insights/service';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

describe('InsightsService', () => {
  const userId = '123e4567-e89b-12d3-a456-426614174000';
  const groupId = '123e4567-e89b-12d3-a456-426614174001';
  const memberA = '123e4567-e89b-12d3-a456-426614174002'; // Alice (currentUser)
  const memberB = '123e4567-e89b-12d3-a456-426614174003'; // Bob
  const memberC = '123e4567-e89b-12d3-a456-426614174004'; // Charlie

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Group Insights (getGroupInsights)', () => {
    it('rejects caller if not a group member with ForbiddenError', async () => {
      const mockSupabase = {
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

      const service = new InsightsService(mockSupabase);
      await expect(service.getGroupInsights(userId, groupId)).rejects.toThrow(
        /not a member/i
      );
    });

    it('throws NotFoundError if group does not exist', async () => {
      const mockSupabase = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'group_members') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { id: memberA, user_id: userId, display_name: 'Alice' },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'groups') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
                }),
              }),
            };
          }
          return {};
        }),
      } as unknown as SupabaseClient<Database>;

      const service = new InsightsService(mockSupabase);
      await expect(service.getGroupInsights(userId, groupId)).rejects.toThrow(
        /group not found/i
      );
    });

    it('computes accurate metrics, category distribution, payer hero, and highlights', async () => {
      const mockExpenses = [
        {
          id: 'exp-1',
          title: 'Dinner at Mainland China',
          description: 'Chinese dinner',
          amount: 300000, // ₹3,000.00
          currency: 'INR',
          expense_date: '2026-10-15T19:30:00Z',
          created_at: '2026-10-15T19:30:00Z',
          is_deleted: false,
        },
        {
          id: 'exp-2',
          title: 'Uber to Airport',
          description: null,
          amount: 150000, // ₹1,500.00
          currency: 'INR',
          expense_date: '2026-10-16T08:00:00Z',
          created_at: '2026-10-16T08:00:00Z',
          is_deleted: false,
        },
      ];

      const mockPayments = [
        // exp-1 paid by Bob
        { expense_id: 'exp-1', group_member_id: memberB, amount_paid: 300000 },
        // exp-2 paid by Alice (currentUser)
        { expense_id: 'exp-2', group_member_id: memberA, amount_paid: 150000 },
      ];

      const mockSplits = [
        // exp-1 split equally between Alice, Bob, Charlie (1000 each)
        { expense_id: 'exp-1', group_member_id: memberA, owed_amount: 100000, split_value: 1 },
        { expense_id: 'exp-1', group_member_id: memberB, owed_amount: 100000, split_value: 1 },
        { expense_id: 'exp-1', group_member_id: memberC, owed_amount: 100000, split_value: 1 },
        // exp-2 split equally between Alice and Bob (750 each)
        { expense_id: 'exp-2', group_member_id: memberA, owed_amount: 75000, split_value: 1 },
        { expense_id: 'exp-2', group_member_id: memberB, owed_amount: 75000, split_value: 1 },
      ];

      const mockSettlements = [
        {
          id: 'sett-1',
          payer_member_id: memberC,
          payee_member_id: memberB,
          amount: 50000,
          settled_at: '2026-10-17T10:00:00Z',
        },
      ];

      const mockSupabase = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'group_members') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockImplementation((col: string, val: string) => {
                  if (col === 'group_id') {
                    return {
                      eq: vi.fn().mockReturnValue({
                        maybeSingle: vi.fn().mockResolvedValue({
                          data: { id: memberA, user_id: userId, display_name: 'Alice' },
                          error: null,
                        }),
                      }),
                      // fetching all members
                      then: (resolve: any) =>
                        resolve({
                          data: [
                            { id: memberA, user_id: userId, display_name: 'Alice', is_placeholder: false },
                            { id: memberB, user_id: 'user-b', display_name: 'Bob', is_placeholder: false },
                            { id: memberC, user_id: null, display_name: 'Charlie', is_placeholder: true },
                          ],
                          error: null,
                        }),
                    };
                  }
                  return {};
                }),
              }),
            };
          }
          if (table === 'groups') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: groupId, name: 'Goa Trip', currency: 'INR' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'expenses') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({
                      data: mockExpenses,
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'expense_payments') {
            return {
              select: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({
                  data: mockPayments,
                  error: null,
                }),
              }),
            };
          }
          if (table === 'expense_splits') {
            return {
              select: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({
                  data: mockSplits,
                  error: null,
                }),
              }),
            };
          }
          if (table === 'settlements') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({
                    data: mockSettlements,
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      } as unknown as SupabaseClient<Database>;

      const service = new InsightsService(mockSupabase);
      const result = await service.getGroupInsights(userId, groupId);

      // Verify group total spend
      expect(result.totalSpend).toBe(450000); // 3000 + 1500 = 4500
      expect(result.expenseCount).toBe(2);
      expect(result.averageExpenseSize).toBe(225000);

      // Verify user's personal spend
      // Alice paid 150,000 upfront. Alice consumed 100,000 (exp 1) + 75,000 (exp 2) = 175,000
      expect(result.userSpend.totalPaid).toBe(150000);
      expect(result.userSpend.totalOwed).toBe(175000);
      expect(result.userSpend.netBalance).toBe(-25000); // 150000 - 175000 = -25000

      // Verify categories: Food & Dining (300000 = 66.7%), Transport (150000 = 33.3%)
      expect(result.categoryBreakdown.length).toBeGreaterThanOrEqual(2);
      expect(result.categoryBreakdown[0].category).toBe('food_dining');
      expect(result.categoryBreakdown[0].totalAmount).toBe(300000);
      expect(result.categoryBreakdown[1].category).toBe('transport');
      expect(result.categoryBreakdown[1].totalAmount).toBe(150000);

      // Verify payer hero is Bob (paid 300000 vs Alice 150000)
      const bobMatrix = result.memberMatrix.find((m) => m.memberId === memberB);
      expect(bobMatrix?.isPayerHero).toBe(true);
      expect(bobMatrix?.totalPaid).toBe(300000);

      const aliceMatrix = result.memberMatrix.find((m) => m.memberId === memberA);
      expect(aliceMatrix?.isPayerHero).toBe(false);

      // Verify timeline
      expect(result.spendingTimeline.length).toBe(2);
      expect(result.spendingTimeline[0].date).toBe('2026-10-15');
      expect(result.spendingTimeline[1].date).toBe('2026-10-16');

      // Verify highlights
      expect(result.highlights.largestExpense?.title).toBe('Dinner at Mainland China');
      expect(result.highlights.largestExpense?.amount).toBe(300000);
      expect(result.highlights.largestExpense?.paidBy).toBe('Bob');
      expect(result.highlights.peakDay?.date).toBe('2026-10-15');
      expect(result.highlights.topPayer?.displayName).toBe('Bob');
      expect(result.highlights.topCategory?.category).toBe('food_dining');
      expect(result.highlights.settledAmount).toBe(50000);
    });
  });

  describe('Overall Insights (getOverallUserInsights)', () => {
    it('returns empty result when user has no groups', async () => {
      const mockSupabase = {
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

      const service = new InsightsService(mockSupabase);
      const result = await service.getOverallUserInsights(userId);

      expect(result.groupCount).toBe(0);
      expect(result.totalExpenseCount).toBe(0);
      expect(result.currencies).toEqual([]);
      expect(result.topPartners).toEqual([]);
      expect(result.aiSpendingBrief).toMatch(/no group spending/i);
    });

    it('correctly aggregates multi-currency groups without currency conversion artifacts', async () => {
      const group1Id = 'g1-inr';
      const group2Id = 'g2-usd';
      const member1Id = 'm1-alice';
      const member2Id = 'm2-alice';
      const memberBob1 = 'm1-bob';
      const memberDave2 = 'm2-dave';

      const mockSupabase = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'group_members') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockImplementation((col: string) => {
                  if (col === 'user_id') {
                    return Promise.resolve({
                      data: [
                        { id: member1Id, group_id: group1Id },
                        { id: member2Id, group_id: group2Id },
                      ],
                      error: null,
                    });
                  }
                  return Promise.resolve({ data: [], error: null });
                }),
                in: vi.fn().mockResolvedValue({
                  data: [
                    { id: member1Id, group_id: group1Id, user_id: userId, display_name: 'Alice', is_placeholder: false },
                    { id: memberBob1, group_id: group1Id, user_id: 'user-bob', display_name: 'Bob', is_placeholder: false },
                    { id: member2Id, group_id: group2Id, user_id: userId, display_name: 'Alice', is_placeholder: false },
                    { id: memberDave2, group_id: group2Id, user_id: 'user-dave', display_name: 'Dave', is_placeholder: false },
                  ],
                  error: null,
                }),
              }),
            };
          }
          if (table === 'groups') {
            return {
              select: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({
                  data: [
                    { id: group1Id, name: 'India Flat', currency: 'INR' },
                    { id: group2Id, name: 'US Project', currency: 'USD' },
                  ],
                  error: null,
                }),
              }),
            };
          }
          if (table === 'expenses') {
            return {
              select: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({
                      data: [
                        {
                          id: 'exp-inr-1',
                          group_id: group1Id,
                          title: 'Swiggy Dinner',
                          description: null,
                          amount: 200000,
                          currency: 'INR',
                          expense_date: '2026-10-10T12:00:00Z',
                          is_deleted: false,
                        },
                        {
                          id: 'exp-usd-1',
                          group_id: group2Id,
                          title: 'AWS Cloud Hosting bill',
                          description: null,
                          amount: 5000, // $50.00
                          currency: 'USD',
                          expense_date: '2026-10-12T15:00:00Z',
                          is_deleted: false,
                        },
                      ],
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'expense_payments') {
            return {
              select: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({
                  data: [
                    // Alice paid for Swiggy
                    { expense_id: 'exp-inr-1', group_member_id: member1Id, amount_paid: 200000 },
                    // Dave paid for AWS
                    { expense_id: 'exp-usd-1', group_member_id: memberDave2, amount_paid: 5000 },
                  ],
                  error: null,
                }),
              }),
            };
          }
          if (table === 'expense_splits') {
            return {
              select: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({
                  data: [
                    // Swiggy split 50-50 between Alice and Bob
                    { expense_id: 'exp-inr-1', group_member_id: member1Id, owed_amount: 100000 },
                    { expense_id: 'exp-inr-1', group_member_id: memberBob1, owed_amount: 100000 },
                    // AWS split 50-50 between Alice and Dave
                    { expense_id: 'exp-usd-1', group_member_id: member2Id, owed_amount: 2500 },
                    { expense_id: 'exp-usd-1', group_member_id: memberDave2, owed_amount: 2500 },
                  ],
                  error: null,
                }),
              }),
            };
          }
          if (table === 'settlements') {
            return {
              select: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      } as unknown as SupabaseClient<Database>;

      const service = new InsightsService(mockSupabase);
      const result = await service.getOverallUserInsights(userId);

      expect(result.groupCount).toBe(2);
      expect(result.currencies).toContain('INR');
      expect(result.currencies).toContain('USD');

      // Check INR accounting
      const inr = result.totalsByCurrency['INR'];
      expect(inr.totalPaidUpfront).toBe(200000);
      expect(inr.totalOutofPocketOwed).toBe(100000);
      expect(inr.netBalance).toBe(100000); // Alice paid 2000, consumed 1000 -> is owed 1000

      // Check USD accounting
      const usd = result.totalsByCurrency['USD'];
      expect(usd.totalPaidUpfront).toBe(0);
      expect(usd.totalOutofPocketOwed).toBe(2500); // $25.00
      expect(usd.netBalance).toBe(-2500); // Alice owes $25.00

      // Check categories
      expect(result.categoriesByCurrency['INR'][0].category).toBe('food_dining');
      expect(result.categoriesByCurrency['USD'][0].category).toBe('utilities');

      // Check partners
      expect(result.topPartners.length).toBeGreaterThan(0);
      const bob = result.topPartners.find((p) => p.displayName === 'Bob');
      expect(bob).toBeDefined();
      expect(bob?.mutualExpenseCount).toBe(1);

      // Check AI spending brief
      expect(result.aiSpendingBrief).toBeTruthy();
    });
  });
});
