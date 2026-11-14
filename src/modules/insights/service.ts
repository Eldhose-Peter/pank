import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { ForbiddenError, NotFoundError, GroupError } from '@/modules/groups/errors';
import { calculateGroupBalances, calculatePairwiseDebts } from '@/modules/accounting/balances';
import type { ExpenseRecord, SettlementInput } from '@/modules/accounting/types';
import { formatMinorUnits } from '@/lib/utils';
import { categorizeExpense } from './categorizer';
import {
  CATEGORY_DEFINITIONS,
  type ExpenseCategory,
  type CategoryBreakdown,
  type TimelineDataPoint,
  type MemberMatrixItem,
  type GroupInsightsResult,
  type OverallInsightsResult,
  type CurrencyTotal,
  type TopPartnerItem,
  type MonthlyTrendItem,
} from './types';

export class InsightsService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Computes comprehensive insights for a single group.
   */
  async getGroupInsights(userId: string, groupId: string): Promise<GroupInsightsResult> {
    // 1. Verify caller membership in group
    const { data: callerMember, error: callerError } = await this.supabase
      .from('group_members')
      .select('id, user_id, display_name')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle();

    if (callerError || !callerMember) {
      throw new ForbiddenError('You are not a member of this group');
    }

    // 2. Fetch group info
    const { data: group, error: groupError } = await this.supabase
      .from('groups')
      .select('id, name, currency')
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

    const memberMap: Record<string, { id: string; userId: string | null; displayName: string; isPlaceholder: boolean }> = {};
    for (const m of members || []) {
      memberMap[m.id] = {
        id: m.id,
        userId: m.user_id,
        displayName: m.display_name,
        isPlaceholder: m.is_placeholder,
      };
    }
    const allMemberIds = (members || []).map((m) => m.id);

    // 4. Fetch non-deleted expenses with payments and splits
    const { data: expenses, error: expensesError } = await this.supabase
      .from('expenses')
      .select('id, title, description, amount, currency, expense_date, created_at, is_deleted')
      .eq('group_id', groupId)
      .eq('is_deleted', false)
      .order('expense_date', { ascending: true });

    if (expensesError) {
      throw new GroupError(expensesError.message);
    }

    const expenseList = expenses || [];
    const expenseIds = expenseList.map((e) => e.id);

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

    // Index payments and splits by expense_id
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

    // 5. Fetch non-deleted settlements
    const { data: settlements, error: settlementsError } = await this.supabase
      .from('settlements')
      .select('id, payer_member_id, payee_member_id, amount, settled_at')
      .eq('group_id', groupId)
      .eq('is_deleted', false);

    if (settlementsError) {
      throw new GroupError(settlementsError.message);
    }

    const settlementList = settlements || [];

    // 6. Build records for authoritative balance calculations
    const expenseRecords: ExpenseRecord[] = expenseList.map((e) => ({
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

    const settlementRecords: SettlementInput[] = settlementList.map((s) => ({
      id: s.id,
      payerMemberId: s.payer_member_id,
      payeeMemberId: s.payee_member_id,
      amount: s.amount,
    }));

    const authoritativeBalances = calculateGroupBalances(allMemberIds, expenseRecords, settlementRecords);

    // 7. Core Group Metrics
    const totalSpend = expenseList.reduce((sum, e) => sum + e.amount, 0);
    const expenseCount = expenseList.length;
    const averageExpenseSize = expenseCount > 0 ? Math.round(totalSpend / expenseCount) : 0;

    // 8. Category Breakdown
    const categoryTotals: Record<ExpenseCategory, { amount: number; count: number }> = {
      food_dining: { amount: 0, count: 0 },
      transport: { amount: 0, count: 0 },
      accommodation: { amount: 0, count: 0 },
      groceries: { amount: 0, count: 0 },
      entertainment: { amount: 0, count: 0 },
      utilities: { amount: 0, count: 0 },
      general: { amount: 0, count: 0 },
    };

    for (const exp of expenseList) {
      const category = categorizeExpense(exp.title, exp.description);
      categoryTotals[category].amount += exp.amount;
      categoryTotals[category].count += 1;
    }

    const categoryBreakdown: CategoryBreakdown[] = (Object.keys(categoryTotals) as ExpenseCategory[])
      .map((cat) => {
        const meta = CATEGORY_DEFINITIONS[cat];
        const data = categoryTotals[cat];
        const percentage = totalSpend > 0 ? Math.round((data.amount / totalSpend) * 1000) / 10 : 0;
        return {
          category: cat,
          label: meta.label,
          totalAmount: data.amount,
          percentage,
          expenseCount: data.count,
          color: meta.color,
          bgColor: meta.bgColor,
          icon: meta.icon,
        };
      })
      .filter((item) => item.totalAmount > 0 || totalSpend === 0)
      .sort((a, b) => b.totalAmount - a.totalAmount);

    // 9. Spending Velocity Timeline (by date)
    const timelineMap: Record<string, { totalAmount: number; expenseCount: number }> = {};
    for (const exp of expenseList) {
      const dateKey = exp.expense_date.split('T')[0];
      if (!timelineMap[dateKey]) {
        timelineMap[dateKey] = { totalAmount: 0, expenseCount: 0 };
      }
      timelineMap[dateKey].totalAmount += exp.amount;
      timelineMap[dateKey].expenseCount += 1;
    }

    const spendingTimeline: TimelineDataPoint[] = Object.entries(timelineMap)
      .map(([date, data]) => ({
        date,
        totalAmount: data.totalAmount,
        expenseCount: data.expenseCount,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 10. Member Matrix (Payer vs. Consumer)
    const memberPaidMap: Record<string, number> = {};
    const memberOwedMap: Record<string, number> = {};
    for (const mId of allMemberIds) {
      memberPaidMap[mId] = 0;
      memberOwedMap[mId] = 0;
    }

    for (const p of expensePayments) {
      memberPaidMap[p.group_member_id] = (memberPaidMap[p.group_member_id] || 0) + p.amount_paid;
    }

    for (const s of expenseSplits) {
      memberOwedMap[s.group_member_id] = (memberOwedMap[s.group_member_id] || 0) + s.owed_amount;
    }

    // Determine Payer Hero (member with highest totalPaid > 0)
    let maxPaidAmount = 0;
    let heroMemberId: string | null = null;
    for (const mId of allMemberIds) {
      const paid = memberPaidMap[mId] || 0;
      if (paid > maxPaidAmount) {
        maxPaidAmount = paid;
        heroMemberId = mId;
      }
    }

    const memberMatrix: MemberMatrixItem[] = allMemberIds.map((mId) => {
      const meta = memberMap[mId];
      const paid = memberPaidMap[mId] || 0;
      const owed = memberOwedMap[mId] || 0;
      const net = authoritativeBalances[mId]?.netBalance || 0;
      const paidPercentage = totalSpend > 0 ? Math.round((paid / totalSpend) * 1000) / 10 : 0;
      const owedPercentage = totalSpend > 0 ? Math.round((owed / totalSpend) * 1000) / 10 : 0;

      return {
        memberId: mId,
        displayName: meta?.displayName || 'Unknown',
        userId: meta?.userId || null,
        isPlaceholder: meta?.isPlaceholder ?? true,
        totalPaid: paid,
        totalOwed: owed,
        netBalance: net,
        paidPercentage,
        owedPercentage,
        isPayerHero: mId === heroMemberId && paid > 0,
      };
    });

    // Sort: current user first, then by totalPaid descending
    memberMatrix.sort((a, b) => {
      if (a.memberId === callerMember.id) return -1;
      if (b.memberId === callerMember.id) return 1;
      return b.totalPaid - a.totalPaid;
    });

    // 11. User's Personal Group Spend
    const userPaid = memberPaidMap[callerMember.id] || 0;
    const userOwed = memberOwedMap[callerMember.id] || 0;
    const userNet = authoritativeBalances[callerMember.id]?.netBalance || 0;
    const userSpend = {
      totalPaid: userPaid,
      totalOwed: userOwed,
      netBalance: userNet,
      paidPercentage: totalSpend > 0 ? Math.round((userPaid / totalSpend) * 1000) / 10 : 0,
      owedPercentage: totalSpend > 0 ? Math.round((userOwed / totalSpend) * 1000) / 10 : 0,
    };

    // 12. Smart Highlights
    let largestExpense: GroupInsightsResult['highlights']['largestExpense'] = null;
    if (expenseList.length > 0) {
      let maxExp = expenseList[0];
      for (const e of expenseList) {
        if (e.amount > maxExp.amount) maxExp = e;
      }
      const expPayments = paymentsByExpense[maxExp.id] || [];
      let primaryPayerPayment = expPayments[0];
      for (const p of expPayments) {
        if (p.amount_paid > (primaryPayerPayment?.amount_paid || 0)) {
          primaryPayerPayment = p;
        }
      }
      const primaryPayerName = primaryPayerPayment
        ? memberMap[primaryPayerPayment.group_member_id]?.displayName || 'Unknown'
        : 'Unknown';

      largestExpense = {
        id: maxExp.id,
        title: maxExp.title,
        amount: maxExp.amount,
        date: maxExp.expense_date.split('T')[0],
        paidBy: primaryPayerName,
      };
    }

    let peakDay: GroupInsightsResult['highlights']['peakDay'] = null;
    if (spendingTimeline.length > 0) {
      let maxDay = spendingTimeline[0];
      for (const d of spendingTimeline) {
        if (d.totalAmount > maxDay.totalAmount) maxDay = d;
      }
      peakDay = {
        date: maxDay.date,
        amount: maxDay.totalAmount,
        count: maxDay.expenseCount,
      };
    }

    const topPayerItem = heroMemberId && maxPaidAmount > 0 ? {
      memberId: heroMemberId,
      displayName: memberMap[heroMemberId]?.displayName || 'Unknown',
      amount: maxPaidAmount,
      percentage: totalSpend > 0 ? Math.round((maxPaidAmount / totalSpend) * 1000) / 10 : 0,
    } : null;

    const topCategoryItem = categoryBreakdown.length > 0 && categoryBreakdown[0].totalAmount > 0 ? {
      category: categoryBreakdown[0].category,
      label: categoryBreakdown[0].label,
      amount: categoryBreakdown[0].totalAmount,
      percentage: categoryBreakdown[0].percentage,
    } : null;

    const settledAmount = settlementList.reduce((sum, s) => sum + s.amount, 0);
    const settledRatio = totalSpend > 0 ? Math.min(100, Math.round((settledAmount / totalSpend) * 100)) : 0;

    return {
      groupId,
      currency: group.currency,
      totalSpend,
      expenseCount,
      averageExpenseSize,
      userSpend,
      categoryBreakdown,
      spendingTimeline,
      memberMatrix,
      highlights: {
        largestExpense,
        peakDay,
        topPayer: topPayerItem,
        topCategory: topCategoryItem,
        settledAmount,
        settledRatio,
      },
    };
  }

  /**
   * Computes cross-group personal financial intelligence across all mutual groups.
   */
  async getOverallUserInsights(userId: string): Promise<OverallInsightsResult> {
    // 1. Fetch all groups where the user is a registered member
    const { data: userMemberships, error: userMembershipsError } = await this.supabase
      .from('group_members')
      .select('id, group_id')
      .eq('user_id', userId);

    if (userMembershipsError) {
      throw new GroupError(userMembershipsError.message);
    }

    if (!userMemberships || userMemberships.length === 0) {
      return {
        userId,
        groupCount: 0,
        totalExpenseCount: 0,
        currencies: [],
        totalsByCurrency: {},
        categoriesByCurrency: {},
        monthlyTrends: [],
        topPartners: [],
        aiSpendingBrief: 'No group spending activity found yet. Join or create a group to start tracking insights.',
      };
    }

    const groupIds = userMemberships.map((m) => m.group_id);
    const userMemberIdByGroup: Record<string, string> = {};
    for (const m of userMemberships) {
      userMemberIdByGroup[m.group_id] = m.id;
    }

    // 2. Fetch group records (for currency mapping)
    const { data: groups, error: groupsError } = await this.supabase
      .from('groups')
      .select('id, name, currency')
      .in('id', groupIds);

    if (groupsError) {
      throw new GroupError(groupsError.message);
    }

    const groupMap: Record<string, { id: string; name: string; currency: string }> = {};
    for (const g of groups || []) {
      groupMap[g.id] = g;
    }

    // Unique currencies across mutual groups
    const distinctCurrencies = Array.from(new Set((groups || []).map((g) => g.currency)));

    // 3. Fetch all group members across all user's groups (to resolve partners)
    const { data: allGroupMembers, error: membersError } = await this.supabase
      .from('group_members')
      .select('id, group_id, user_id, display_name, is_placeholder')
      .in('group_id', groupIds);

    if (membersError) {
      throw new GroupError(membersError.message);
    }

    const memberDetailsMap: Record<string, { id: string; groupId: string; userId: string | null; displayName: string }> = {};
    for (const m of allGroupMembers || []) {
      memberDetailsMap[m.id] = {
        id: m.id,
        groupId: m.group_id,
        userId: m.user_id,
        displayName: m.display_name,
      };
    }

    // 4. Fetch all active expenses across all user's groups
    const { data: allExpenses, error: expensesError } = await this.supabase
      .from('expenses')
      .select('id, group_id, title, description, amount, currency, expense_date, is_deleted')
      .in('group_id', groupIds)
      .eq('is_deleted', false)
      .order('expense_date', { ascending: true });

    if (expensesError) {
      throw new GroupError(expensesError.message);
    }

    const activeExpenses = allExpenses || [];
    const expenseIds = activeExpenses.map((e) => e.id);

    let allPayments: { expense_id: string; group_member_id: string; amount_paid: number }[] = [];
    let allSplits: { expense_id: string; group_member_id: string; owed_amount: number }[] = [];

    if (expenseIds.length > 0) {
      const { data: payments } = await this.supabase
        .from('expense_payments')
        .select('expense_id, group_member_id, amount_paid')
        .in('expense_id', expenseIds);

      const { data: splits } = await this.supabase
        .from('expense_splits')
        .select('expense_id, group_member_id, owed_amount')
        .in('expense_id', expenseIds);

      allPayments = payments || [];
      allSplits = splits || [];
    }

    const paymentsByExpense: Record<string, typeof allPayments> = {};
    for (const p of allPayments) {
      if (!paymentsByExpense[p.expense_id]) paymentsByExpense[p.expense_id] = [];
      paymentsByExpense[p.expense_id].push(p);
    }

    const splitsByExpense: Record<string, typeof allSplits> = {};
    for (const s of allSplits) {
      if (!splitsByExpense[s.expense_id]) splitsByExpense[s.expense_id] = [];
      splitsByExpense[s.expense_id].push(s);
    }

    // 5. Fetch all settlements across all user's groups
    const { data: allSettlements, error: settlementsError } = await this.supabase
      .from('settlements')
      .select('id, group_id, payer_member_id, payee_member_id, amount, settled_at')
      .in('group_id', groupIds)
      .eq('is_deleted', false);

    if (settlementsError) {
      throw new GroupError(settlementsError.message);
    }

    const activeSettlements = allSettlements || [];

    // 6. Aggregate Totals and Categories By Currency
    const totalsByCurrency: Record<string, CurrencyTotal> = {};
    const categoriesByCurrency: Record<string, CategoryBreakdown[]> = {};

    for (const curr of distinctCurrencies) {
      totalsByCurrency[curr] = {
        currency: curr,
        totalOutofPocketOwed: 0,
        totalPaidUpfront: 0,
        totalReimbursed: 0,
        totalSettledPaid: 0,
        netBalance: 0,
      };

      const categoryTally: Record<ExpenseCategory, { amount: number; count: number }> = {
        food_dining: { amount: 0, count: 0 },
        transport: { amount: 0, count: 0 },
        accommodation: { amount: 0, count: 0 },
        groceries: { amount: 0, count: 0 },
        entertainment: { amount: 0, count: 0 },
        utilities: { amount: 0, count: 0 },
        general: { amount: 0, count: 0 },
      };

      // Filter expenses for this currency
      const currExpenses = activeExpenses.filter((e) => groupMap[e.group_id]?.currency === curr);

      for (const exp of currExpenses) {
        const callerMemberId = userMemberIdByGroup[exp.group_id];
        const payments = paymentsByExpense[exp.id] || [];
        const splits = splitsByExpense[exp.id] || [];

        // Upfront paid by user
        const userPayment = payments.find((p) => p.group_member_id === callerMemberId);
        if (userPayment) {
          totalsByCurrency[curr].totalPaidUpfront += userPayment.amount_paid;
        }

        // Out-of-pocket consumption by user
        const userSplit = splits.find((s) => s.group_member_id === callerMemberId);
        if (userSplit && userSplit.owed_amount > 0) {
          totalsByCurrency[curr].totalOutofPocketOwed += userSplit.owed_amount;

          // Categorize user's consumption
          const cat = categorizeExpense(exp.title, exp.description);
          categoryTally[cat].amount += userSplit.owed_amount;
          categoryTally[cat].count += 1;
        }
      }

      // Filter settlements for this currency
      const currSettlements = activeSettlements.filter((s) => groupMap[s.group_id]?.currency === curr);
      for (const st of currSettlements) {
        const callerMemberId = userMemberIdByGroup[st.group_id];
        if (st.payee_member_id === callerMemberId) {
          // Reimbursed to user
          totalsByCurrency[curr].totalReimbursed += st.amount;
        }
        if (st.payer_member_id === callerMemberId) {
          // Settled / paid by user
          totalsByCurrency[curr].totalSettledPaid += st.amount;
        }
      }

      // Net balance in this currency
      const t = totalsByCurrency[curr];
      t.netBalance = t.totalPaidUpfront - t.totalOutofPocketOwed + t.totalSettledPaid - t.totalReimbursed;

      // Category breakdown list
      const totalConsumed = t.totalOutofPocketOwed;
      categoriesByCurrency[curr] = (Object.keys(categoryTally) as ExpenseCategory[])
        .map((cat) => {
          const meta = CATEGORY_DEFINITIONS[cat];
          const data = categoryTally[cat];
          const percentage = totalConsumed > 0 ? Math.round((data.amount / totalConsumed) * 1000) / 10 : 0;
          return {
            category: cat,
            label: meta.label,
            totalAmount: data.amount,
            percentage,
            expenseCount: data.count,
            color: meta.color,
            bgColor: meta.bgColor,
            icon: meta.icon,
          };
        })
        .filter((item) => item.totalAmount > 0 || totalConsumed === 0)
        .sort((a, b) => b.totalAmount - a.totalAmount);
    }

    // 7. Monthly Consumption Trends (Last 6 months)
    const monthlyMap: Record<string, Record<string, number>> = {};
    for (const exp of activeExpenses) {
      const callerMemberId = userMemberIdByGroup[exp.group_id];
      const splits = splitsByExpense[exp.id] || [];
      const userSplit = splits.find((s) => s.group_member_id === callerMemberId);
      if (userSplit && userSplit.owed_amount > 0) {
        const monthKey = exp.expense_date.substring(0, 7); // 'YYYY-MM'
        const curr = groupMap[exp.group_id]?.currency || 'INR';
        if (!monthlyMap[monthKey]) {
          monthlyMap[monthKey] = {};
        }
        monthlyMap[monthKey][curr] = (monthlyMap[monthKey][curr] || 0) + userSplit.owed_amount;
      }
    }

    const monthKeys = Object.keys(monthlyMap).sort();
    // Keep at most 6 latest months
    const recentMonths = monthKeys.slice(-6);

    const monthlyTrends: MonthlyTrendItem[] = recentMonths.map((m) => {
      const [year, monthNum] = m.split('-');
      const dateObj = new Date(parseInt(year, 10), parseInt(monthNum, 10) - 1, 1);
      const label = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      return {
        month: m,
        label,
        byCurrency: monthlyMap[m] || {},
      };
    });

    // 8. Top Split Partners / Frequent Companions
    // Find all distinct group members that share groups with user (excluding user themselves)
    interface PartnerAgg {
      userId: string | null;
      memberId: string;
      displayName: string;
      sharedGroupIds: Set<string>;
      mutualExpenseCount: number;
      totalVolume: number;
      netBalance: number;
      currency: string;
    }

    const partnerMap: Record<string, PartnerAgg> = {};

    for (const m of allGroupMembers || []) {
      const callerMemberId = userMemberIdByGroup[m.group_id];
      if (m.id === callerMemberId || (m.user_id && m.user_id === userId)) {
        continue;
      }

      const partnerBaseKey = m.user_id ? `user:${m.user_id}` : `member:${m.id}`;
      const curr = groupMap[m.group_id]?.currency || 'INR';
      const partnerKey = `${partnerBaseKey}_${curr}`;
      if (!partnerMap[partnerKey]) {
        partnerMap[partnerKey] = {
          userId: m.user_id,
          memberId: m.id,
          displayName: m.display_name,
          sharedGroupIds: new Set<string>(),
          mutualExpenseCount: 0,
          totalVolume: 0,
          netBalance: 0,
          currency: curr,
        };
      }
      partnerMap[partnerKey].sharedGroupIds.add(m.group_id);
    }

    // Tally mutual bills and calculate pairwise balances
    for (const exp of activeExpenses) {
      const callerMemberId = userMemberIdByGroup[exp.group_id];
      const payments = paymentsByExpense[exp.id] || [];
      const splits = splitsByExpense[exp.id] || [];

      const userPaidThis = payments.find((p) => p.group_member_id === callerMemberId);
      const userOwedThis = splits.find((s) => s.group_member_id === callerMemberId);
      const userInvolved = Boolean(userPaidThis || userOwedThis);

      if (!userInvolved) continue;

      for (const s of splits) {
        if (s.group_member_id === callerMemberId) continue;
        const partnerMeta = memberDetailsMap[s.group_member_id];
        if (!partnerMeta) continue;
        const partnerBaseKey = partnerMeta.userId ? `user:${partnerMeta.userId}` : `member:${partnerMeta.id}`;
        const curr = groupMap[exp.group_id]?.currency || 'INR';
        const partnerKey = `${partnerBaseKey}_${curr}`;
        if (partnerMap[partnerKey]) {
          partnerMap[partnerKey].mutualExpenseCount += 1;
          partnerMap[partnerKey].totalVolume += exp.amount;
        }
      }
    }

    // Calculate bilateral debts per group
    for (const gId of groupIds) {
      const callerMemberId = userMemberIdByGroup[gId];
      const gExpenses = activeExpenses.filter((e) => e.group_id === gId);
      const gSettlements = activeSettlements.filter((s) => s.group_id === gId);
      const curr = groupMap[gId]?.currency || 'INR';

      const expRecords: ExpenseRecord[] = gExpenses.map((e) => ({
        id: e.id,
        amount: e.amount,
        isDeleted: e.is_deleted,
        payments: (paymentsByExpense[e.id] || []).map((p) => ({
          memberId: p.group_member_id,
          amountPaid: p.amount_paid,
        })),
        splits: (splitsByExpense[e.id] || []).map((s) => ({
          memberId: s.group_member_id,
          splitValue: 1,
          owedAmount: s.owed_amount,
        })),
      }));

      const settRecords: SettlementInput[] = gSettlements.map((s) => ({
        id: s.id,
        payerMemberId: s.payer_member_id,
        payeeMemberId: s.payee_member_id,
        amount: s.amount,
      }));

      const pairwise = calculatePairwiseDebts(expRecords, settRecords);
      for (const debt of pairwise) {
        if (debt.toMemberId === callerMemberId) {
          // fromMember owes user
          const partnerMeta = memberDetailsMap[debt.fromMemberId];
          if (partnerMeta) {
            const partnerBaseKey = partnerMeta.userId ? `user:${partnerMeta.userId}` : `member:${partnerMeta.id}`;
            const partnerKey = `${partnerBaseKey}_${curr}`;
            if (partnerMap[partnerKey]) {
              partnerMap[partnerKey].netBalance += debt.amount;
            }
          }
        } else if (debt.fromMemberId === callerMemberId) {
          // user owes toMember
          const partnerMeta = memberDetailsMap[debt.toMemberId];
          if (partnerMeta) {
            const partnerBaseKey = partnerMeta.userId ? `user:${partnerMeta.userId}` : `member:${partnerMeta.id}`;
            const partnerKey = `${partnerBaseKey}_${curr}`;
            if (partnerMap[partnerKey]) {
              partnerMap[partnerKey].netBalance -= debt.amount;
            }
          }
        }
      }
    }

    const topPartners: TopPartnerItem[] = Object.values(partnerMap)
      .map((p) => ({
        userId: p.userId,
        memberId: p.memberId,
        displayName: p.displayName,
        groupCount: p.sharedGroupIds.size,
        mutualExpenseCount: p.mutualExpenseCount,
        totalVolume: p.totalVolume,
        netBalance: p.netBalance,
        currency: p.currency,
      }))
      .sort((a, b) => b.mutualExpenseCount - a.mutualExpenseCount || b.totalVolume - a.totalVolume)
      .slice(0, 5);

    // 9. Concise Executive AI Spending Brief
    let aiSpendingBrief = '';
    if (distinctCurrencies.length > 0) {
      const primaryCurr = distinctCurrencies[0];
      const primaryTotal = totalsByCurrency[primaryCurr];
      const primaryCategories = categoriesByCurrency[primaryCurr] || [];
      const topCat = primaryCategories.length > 0 && primaryCategories[0].totalAmount > 0
        ? primaryCategories[0]
        : null;

      const consumptionStr = formatMinorUnits(primaryTotal.totalOutofPocketOwed, primaryCurr);
      const balanceStr = formatMinorUnits(Math.abs(primaryTotal.netBalance), primaryCurr);

      const netStatus = primaryTotal.netBalance > 0
        ? `You are currently owed ${balanceStr} across your groups.`
        : primaryTotal.netBalance < 0
        ? `You owe ${balanceStr} across your groups.`
        : 'All shared balances are completely settled.';

      if (topCat) {
        aiSpendingBrief = `Across your ${groupIds.length} mutual groups, your personal consumption in ${primaryCurr} is ${consumptionStr}, with ${topCat.label} taking the largest share (${topCat.percentage}%). ${netStatus}`;
      } else {
        aiSpendingBrief = `Across your ${groupIds.length} mutual groups, total out-of-pocket consumption in ${primaryCurr} is ${consumptionStr}. ${netStatus}`;
      }
    } else {
      aiSpendingBrief = 'No group spending activity found yet. Join or create a group to start tracking insights.';
    }

    return {
      userId,
      groupCount: groupIds.length,
      totalExpenseCount: activeExpenses.length,
      currencies: distinctCurrencies,
      totalsByCurrency,
      categoriesByCurrency,
      monthlyTrends,
      topPartners,
      aiSpendingBrief,
    };
  }
}
