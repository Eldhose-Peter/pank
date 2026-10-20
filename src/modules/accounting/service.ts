import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import {
  calculateGroupBalances,
  simplifyDebts,
  calculatePairwiseDebts,
} from './balances';
import type { MemberBalance, PairwiseDebt, ExpenseRecord, SettlementInput } from './types';
import { ForbiddenError, NotFoundError, GroupError } from '@/modules/groups/errors';

export interface EnrichedMemberBalance extends MemberBalance {
  displayName: string;
  userId: string | null;
  isPlaceholder: boolean;
}

export interface EnrichedPairwiseDebt extends PairwiseDebt {
  fromDisplayName: string;
  toDisplayName: string;
  currency: string;
}

export interface GroupBalanceSummary {
  groupId: string;
  currency: string;
  totalGroupSpending: number;
  balances: Record<string, EnrichedMemberBalance>;
  simplifiedDebts: EnrichedPairwiseDebt[];
  pairwiseDebts: EnrichedPairwiseDebt[];
}

export class BalanceService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Fetches all group members, active expenses, and settlements,
   * then computes deterministic member balances, simplified debts, and pairwise debts.
   */
  async getGroupBalances(userId: string, groupId: string): Promise<GroupBalanceSummary> {
    // 1. Verify caller membership
    const { data: callerMember, error: callerError } = await this.supabase
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle();

    if (callerError || !callerMember) {
      throw new ForbiddenError('You are not a member of this group');
    }

    // 2. Fetch group info
    const { data: group, error: groupError } = await this.supabase
      .from('groups')
      .select('currency')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      throw new NotFoundError('Group not found');
    }

    // 3. Fetch all group members
    const { data: members, error: membersError } = await this.supabase
      .from('group_members')
      .select('id, user_id, display_name, is_placeholder')
      .eq('group_id', groupId);

    if (membersError) {
      throw new GroupError(membersError.message);
    }

    const memberMap: Record<string, { displayName: string; userId: string | null; isPlaceholder: boolean }> = {};
    for (const m of members || []) {
      memberMap[m.id] = {
        displayName: m.display_name,
        userId: m.user_id,
        isPlaceholder: m.is_placeholder,
      };
    }
    const allMemberIds = (members || []).map((m) => m.id);

    // 4. Fetch non-deleted expenses with payments and splits
    const { data: expenses, error: expensesError } = await this.supabase
      .from('expenses')
      .select('id, amount, is_deleted')
      .eq('group_id', groupId)
      .eq('is_deleted', false);

    if (expensesError) {
      throw new GroupError(expensesError.message);
    }

    const expenseIds = (expenses || []).map((e) => e.id);

    let expensePayments: { expense_id: string; group_member_id: string; amount_paid: number }[] = [];
    let expenseSplits: { expense_id: string; group_member_id: string; owed_amount: number; split_value: number }[] = [];

    if (expenseIds.length > 0) {
      const { data: payments } = await this.supabase
        .from('expense_payments')
        .select('expense_id, group_member_id, amount_paid')
        .in('expense_id', expenseIds);

      const { data: splits } = await this.supabase
        .from('expense_splits')
        .select('expense_id, group_member_id, owed_amount, split_value')
        .in('expense_id', expenseIds);

      expensePayments = payments || [];
      expenseSplits = splits || [];
    }

    const paymentsByExpense: Record<string, typeof expensePayments> = {};
    for (const p of expensePayments) {
      if (!paymentsByExpense[p.expense_id]) paymentsByExpense[p.expense_id] = [];
      paymentsByExpense[p.expense_id].push(p);
    }

    const splitsByExpense: Record<string, typeof expenseSplits> = {};
    for (const s of expenseSplits) {
      if (!splitsByExpense[s.expense_id]) splitsByExpense[s.expense_id] = [];
      splitsByExpense[s.expense_id].push(s);
    }

    const expenseRecords: ExpenseRecord[] = (expenses || []).map((e) => ({
      id: e.id,
      amount: e.amount,
      isDeleted: e.is_deleted,
      payments: (paymentsByExpense[e.id] || []).map((p) => ({
        memberId: p.group_member_id,
        amountPaid: p.amount_paid,
      })),
      splits: (splitsByExpense[e.id] || []).map((s) => ({
        memberId: s.group_member_id,
        splitValue: Number(s.split_value),
        owedAmount: s.owed_amount,
      })),
    }));

    // 5. Fetch non-deleted settlements
    const { data: settlements, error: settlementsError } = await this.supabase
      .from('settlements')
      .select('id, payer_member_id, payee_member_id, amount')
      .eq('group_id', groupId)
      .eq('is_deleted', false);

    if (settlementsError) {
      throw new GroupError(settlementsError.message);
    }

    const settlementRecords: SettlementInput[] = (settlements || []).map((s) => ({
      id: s.id,
      payerMemberId: s.payer_member_id,
      payeeMemberId: s.payee_member_id,
      amount: s.amount,
    }));

    // 6. Compute authoritative balances
    const rawBalances = calculateGroupBalances(allMemberIds, expenseRecords, settlementRecords);
    const enrichedBalances: Record<string, EnrichedMemberBalance> = {};

    for (const [memberId, balance] of Object.entries(rawBalances)) {
      const meta = memberMap[memberId] || { displayName: 'Unknown', userId: null, isPlaceholder: false };
      enrichedBalances[memberId] = {
        ...balance,
        displayName: meta.displayName,
        userId: meta.userId,
        isPlaceholder: meta.isPlaceholder,
      };
    }

    // 7. Compute simplified and direct debts
    const rawSimplified = simplifyDebts(rawBalances, group.currency);
    const enrichedSimplified: EnrichedPairwiseDebt[] = rawSimplified.map((d) => ({
      ...d,
      fromDisplayName: memberMap[d.fromMemberId]?.displayName || 'Unknown',
      toDisplayName: memberMap[d.toMemberId]?.displayName || 'Unknown',
      currency: group.currency,
    }));

    const rawPairwise = calculatePairwiseDebts(expenseRecords, settlementRecords);
    const enrichedPairwise: EnrichedPairwiseDebt[] = rawPairwise.map((d) => ({
      ...d,
      fromDisplayName: memberMap[d.fromMemberId]?.displayName || 'Unknown',
      toDisplayName: memberMap[d.toMemberId]?.displayName || 'Unknown',
      currency: group.currency,
    }));

    const totalGroupSpending = (expenses || []).reduce((sum, e) => sum + e.amount, 0);

    return {
      groupId,
      currency: group.currency,
      totalGroupSpending,
      balances: enrichedBalances,
      simplifiedDebts: enrichedSimplified,
      pairwiseDebts: enrichedPairwise,
    };
  }
}
