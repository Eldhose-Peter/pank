'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Plus, 
  Receipt, 
  Users, 
  Scale, 
  Handshake, 
  Share2, 
  UserPlus, 
  Trash2, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2,
  Sparkles,
  Bot
} from 'lucide-react';
import { formatMinorUnits, getCurrencySymbol } from '@/lib/utils';
import { AddExpenseModal } from '@/components/expenses/AddExpenseModal';
import { SettleUpModal } from '@/components/settlements/SettleUpModal';
import { AddMemberModal } from '@/components/groups/AddMemberModal';
import { InviteModal } from '@/components/groups/InviteModal';
import { AiExpenseModal } from '@/components/ai/AiExpenseModal';
import { GroupAssistantModal } from '@/components/ai/GroupAssistantModal';

interface GroupData {
  id: string;
  name: string;
  description?: string | null;
  currency: string;
  createdBy: string;
}

interface MemberData {
  id: string;
  groupId: string;
  userId?: string | null;
  displayName: string;
  role: string;
  isPlaceholder: boolean;
}

interface ExpensePayment {
  id?: string;
  groupMemberId: string;
  amountPaid: number;
}

interface ExpenseSplit {
  id?: string;
  groupMemberId: string;
  owedAmount: number;
  splitValue?: number;
}

interface ExpenseItem {
  id: string;
  title: string;
  description?: string | null;
  amount: number;
  currency: string;
  splitType: string;
  expenseDate: string;
  payments: ExpensePayment[];
  splits: ExpenseSplit[];
}

interface SettlementItem {
  id: string;
  payerMemberId: string;
  payeeMemberId: string;
  amount: number;
  currency: string;
  paymentMethod?: string | null;
  notes?: string | null;
  settledAt: string;
}

interface MemberBalance {
  memberId: string;
  displayName: string;
  totalPaid: number;
  totalOwed: number;
  netBalance: number;
  isPlaceholder: boolean;
}

interface SimplifiedDebt {
  fromMemberId: string;
  toMemberId: string;
  fromDisplayName: string;
  toDisplayName: string;
  amount: number;
  currency: string;
}

interface BalancesSummary {
  groupId: string;
  currency: string;
  totalGroupSpending: number;
  balances: Record<string, MemberBalance>;
  simplifiedDebts: SimplifiedDebt[];
}

interface GroupDetailClientProps {
  groupId: string;
  initialGroup: GroupData;
  initialMembers: MemberData[];
  initialExpenses?: ExpenseItem[];
  initialBalances?: BalancesSummary | null;
  initialSettlements?: SettlementItem[];
  currentUserId: string;
}

export function GroupDetailClient({
  groupId,
  initialGroup,
  initialMembers,
  initialExpenses = [],
  initialBalances = null,
  initialSettlements = [],
  currentUserId,
}: GroupDetailClientProps) {
  const router = useRouter();
  const [group, setGroup] = useState<GroupData>(initialGroup);
  const [members, setMembers] = useState<MemberData[]>(initialMembers);
  const [expenses, setExpenses] = useState<ExpenseItem[]>(initialExpenses);
  const [balances, setBalances] = useState<BalancesSummary | null>(initialBalances);
  const [settlements, setSettlements] = useState<SettlementItem[]>(initialSettlements);
  const [loadingExtras, setLoadingExtras] = useState(!initialBalances);

  // Active Tab: 'expenses' | 'balances' | 'settlements' | 'members'
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances' | 'settlements' | 'members'>('expenses');
  
  // Expanded expense items
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);

  // Modals state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAiExpenseOpen, setIsAiExpenseOpen] = useState(false);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [isSettleUpOpen, setIsSettleUpOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  // Pre-filled settlement state from simplified debt row
  const [settlePayerId, setSettlePayerId] = useState<string | undefined>();
  const [settlePayeeId, setSettlePayeeId] = useState<string | undefined>();
  const [settleAmount, setSettleAmount] = useState<number | undefined>();

  const currentMember = members.find((m) => m.userId === currentUserId);

  const loadAllData = async () => {
    try {
      setLoadingExtras(true);
      const [groupRes, expRes, balRes, setRes] = await Promise.all([
        fetch(`/api/groups/${groupId}`),
        fetch(`/api/groups/${groupId}/expenses`),
        fetch(`/api/groups/${groupId}/balances`),
        fetch(`/api/groups/${groupId}/settlements`),
      ]);

      if (groupRes.ok) {
        const groupData = await groupRes.json();
        setGroup(groupData.group);
        setMembers(groupData.members || []);
      }

      if (expRes.ok) {
        const expData = await expRes.json();
        setExpenses(expData.expenses || []);
      }

      if (balRes.ok) {
        const balData = await balRes.json();
        setBalances(balData);
      }

      if (setRes.ok) {
        const setData = await setRes.json();
        setSettlements(setData.settlements || []);
      }
    } catch (err) {
      console.error('Error refreshing group data:', err);
    } finally {
      setLoadingExtras(false);
    }
  };

  useEffect(() => {
    if (!initialBalances) {
      loadAllData();
    }
  }, [groupId]);

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/expenses/${expenseId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        loadAllData();
      }
    } catch (err) {
      console.error('Delete expense error:', err);
    }
  };

  const handleDeleteSettlement = async (settlementId: string) => {
    if (!confirm('Are you sure you want to revert this settlement?')) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/settlements/${settlementId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        loadAllData();
      }
    } catch (err) {
      console.error('Delete settlement error:', err);
    }
  };

  const openQuickSettle = (fromId: string, toId: string, amount: number) => {
    setSettlePayerId(fromId);
    setSettlePayeeId(toId);
    setSettleAmount(amount);
    setIsSettleUpOpen(true);
  };

  const getMemberName = (memberId: string) => {
    const m = members.find((mem) => mem.id === memberId);
    return m ? m.displayName : 'Unknown';
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back button */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Groups
      </Link>

      {/* Group Header */}
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
              {group.name}
            </h1>
            <span className="rounded-md bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              {group.currency}
            </span>
          </div>
          {group.description && (
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {group.description}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAiAssistantOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/50 px-3.5 py-2 text-xs font-semibold text-indigo-700 shadow-sm hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer"
          >
            <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            Ask AI
          </button>

          <button
            onClick={() => {
              setSettlePayerId(undefined);
              setSettlePayeeId(undefined);
              setSettleAmount(undefined);
              setIsSettleUpOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            <Handshake className="h-4 w-4 text-emerald-600" />
            Settle Up
          </button>

          <button
            onClick={() => setIsInviteOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            <Share2 className="h-4 w-4 text-purple-600" />
            Invite
          </button>

          <button
            onClick={() => setIsAddExpenseOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Manually
          </button>

          <button
            onClick={() => setIsAiExpenseOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:from-indigo-500 hover:to-violet-500 transition-all cursor-pointer"
          >
            <Sparkles className="h-4 w-4 text-amber-300" />
            Fast AI Add
          </button>
        </div>
      </div>

      {/* Metric Highlights */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-xs font-medium text-zinc-500">Total Group Spending</span>
          <div className="mt-1 text-xl font-bold font-mono text-zinc-900 dark:text-white">
            {formatMinorUnits(balances?.totalGroupSpending || 0, group.currency)}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-xs font-medium text-zinc-500">Expenses Logged</span>
          <div className="mt-1 text-xl font-bold text-zinc-900 dark:text-white">
            {expenses.length}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-xs font-medium text-zinc-500">Total Members</span>
          <div className="mt-1 text-xl font-bold text-zinc-900 dark:text-white">
            {members.length}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-xs font-medium text-zinc-500">Simplified Debts</span>
          <div className="mt-1 text-xl font-bold text-indigo-600 dark:text-indigo-400">
            {balances?.simplifiedDebts.length || 0}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mt-8 border-b border-zinc-200 dark:border-zinc-800">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex items-center gap-2 border-b-2 py-3 text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'expenses'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <Receipt className="h-4 w-4" />
            Expenses ({expenses.length})
          </button>

          <button
            onClick={() => setActiveTab('balances')}
            className={`flex items-center gap-2 border-b-2 py-3 text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'balances'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <Scale className="h-4 w-4" />
            Balances & Debts
          </button>

          <button
            onClick={() => setActiveTab('settlements')}
            className={`flex items-center gap-2 border-b-2 py-3 text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'settlements'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <Handshake className="h-4 w-4" />
            Settlements ({settlements.length})
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 border-b-2 py-3 text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'members'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <Users className="h-4 w-4" />
            Members ({members.length})
          </button>
        </nav>
      </div>

      {/* Tab 1: Expenses */}
      {activeTab === 'expenses' && (
        <div className="mt-6 space-y-3">
          {loadingExtras && expenses.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
                      <div className="space-y-2">
                        <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
                        <div className="h-3 w-48 rounded bg-zinc-100 dark:bg-zinc-800" />
                      </div>
                    </div>
                    <div className="h-5 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : expenses.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-zinc-200 p-12 text-center dark:border-zinc-800">
              <Receipt className="mx-auto h-8 w-8 text-zinc-400" />
              <h3 className="mt-2 text-sm font-semibold text-zinc-900 dark:text-white">No expenses recorded yet</h3>
              <p className="mt-1 text-xs text-zinc-500">Record a bill or expense to start tracking splits.</p>
              <button
                onClick={() => setIsAddExpenseOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Add First Expense
              </button>
            </div>
          ) : (
            expenses.map((expense) => {
              const isExpanded = expandedExpenseId === expense.id;
              const primaryPayer = expense.payments[0];
              const payerName = primaryPayer ? getMemberName(primaryPayer.groupMemberId) : 'Unknown';

              return (
                <div
                  key={expense.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                        <Receipt className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                          {expense.title}
                        </h4>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {expense.expenseDate}
                          </span>
                          <span>•</span>
                          <span>
                            Paid by <strong className="text-zinc-700 dark:text-zinc-300">{payerName}</strong>
                          </span>
                          <span>•</span>
                          <span className="capitalize">{expense.splitType} split</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-base font-bold font-mono text-zinc-900 dark:text-white">
                          {formatMinorUnits(expense.amount, expense.currency)}
                        </div>
                        <div className="text-xs text-zinc-400">
                          {expense.splits.length} participants
                        </div>
                      </div>

                      <button
                        onClick={() => setExpandedExpenseId(isExpanded ? null : expense.id)}
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                        title="View details"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>

                      <button
                        onClick={() => handleDeleteExpense(expense.id)}
                        className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
                        title="Delete expense"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expandable splits breakdown */}
                  {isExpanded && (
                    <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                        Split Breakdown
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {expense.splits.map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-1.5 text-xs dark:bg-zinc-800/60"
                          >
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">
                              {getMemberName(s.groupMemberId)}
                            </span>
                            <span className="font-mono text-zinc-900 dark:text-white">
                              owes {formatMinorUnits(s.owedAmount, expense.currency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 2: Balances & Simplified Debts */}
      {activeTab === 'balances' && (
        <div className="mt-6 space-y-8">
          {/* Simplified Pairwise Debts */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Simplified Debts (Minimum Transactions)
                </h3>
                <p className="text-xs text-zinc-500">
                  Greedy cash-flow reduction eliminates redundant cycles.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                Zero-sum guaranteed
              </div>
            </div>

            {loadingExtras && !balances ? (
              <div className="mt-3 animate-pulse rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">
                Calculating balances and debts...
              </div>
            ) : balances?.simplifiedDebts.length === 0 ? (
              <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
                All debts are settled! No payments are owed.
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {balances?.simplifiedDebts.map((debt, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div>
                      <div className="text-sm text-zinc-800 dark:text-zinc-200">
                        <strong className="text-red-600 dark:text-red-400">{debt.fromDisplayName}</strong>
                        {' owes '}
                        <strong className="text-emerald-600 dark:text-emerald-400">{debt.toDisplayName}</strong>
                      </div>
                      <div className="mt-1 text-base font-bold font-mono text-zinc-900 dark:text-white">
                        {formatMinorUnits(debt.amount, debt.currency)}
                      </div>
                    </div>

                    <button
                      onClick={() => openQuickSettle(debt.fromMemberId, debt.toMemberId, debt.amount)}
                      className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors cursor-pointer"
                    >
                      <Handshake className="h-3.5 w-3.5" />
                      Settle
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Member Net Balances Table */}
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              Member Net Balances
            </h3>
            <p className="text-xs text-zinc-500 mb-3">
              Total paid vs. total share owed per member.
            </p>

            <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <table className="min-w-full divide-y divide-zinc-200 text-left text-sm dark:divide-zinc-800">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-xs font-semibold uppercase text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3">Total Paid</th>
                    <th className="px-4 py-3">Total Share</th>
                    <th className="px-4 py-3 text-right">Net Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {balances && Object.values(balances.balances).map((mb) => {
                    const isPositive = mb.netBalance > 0;
                    const isZero = mb.netBalance === 0;

                    return (
                      <tr key={mb.memberId} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                        <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-white">
                          {mb.displayName}
                          {mb.isPlaceholder && (
                            <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800">
                              Placeholder
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-zinc-600 dark:text-zinc-400">
                          {formatMinorUnits(mb.totalPaid, group.currency)}
                        </td>
                        <td className="px-4 py-3 font-mono text-zinc-600 dark:text-zinc-400">
                          {formatMinorUnits(mb.totalOwed, group.currency)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold">
                          {isZero ? (
                            <span className="text-zinc-400">Settled</span>
                          ) : isPositive ? (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              +{formatMinorUnits(mb.netBalance, group.currency)}
                            </span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400">
                              {formatMinorUnits(mb.netBalance, group.currency)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Settlements */}
      {activeTab === 'settlements' && (
        <div className="mt-6 space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setSettlePayerId(undefined);
                setSettlePayeeId(undefined);
                setSettleAmount(undefined);
                setIsSettleUpOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors cursor-pointer"
            >
              <Handshake className="h-4 w-4" />
              Record Settlement
            </button>
          </div>

          {loadingExtras && settlements.length === 0 ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="h-10 w-full rounded bg-zinc-100 dark:bg-zinc-800" />
                </div>
              ))}
            </div>
          ) : settlements.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-zinc-200 p-12 text-center dark:border-zinc-800">
              <Handshake className="mx-auto h-8 w-8 text-zinc-400" />
              <h3 className="mt-2 text-sm font-semibold text-zinc-900 dark:text-white">No settlements recorded yet</h3>
              <p className="mt-1 text-xs text-zinc-500">Record payments made between members to settle up debts.</p>
            </div>
          ) : (
            settlements.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                    <Handshake className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-zinc-900 dark:text-white">
                      <strong>{getMemberName(s.payerMemberId)}</strong> paid <strong>{getMemberName(s.payeeMemberId)}</strong>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
                      <span>{new Date(s.settledAt).toLocaleDateString()}</span>
                      {s.paymentMethod && <span>• {s.paymentMethod}</span>}
                      {s.notes && <span>• &ldquo;{s.notes}&rdquo;</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-base text-emerald-600 dark:text-emerald-400">
                    {formatMinorUnits(s.amount, s.currency)}
                  </span>
                  <button
                    onClick={() => handleDeleteSettlement(s.id)}
                    className="rounded-lg p-1.5 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer"
                    title="Revert settlement"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 4: Members */}
      {activeTab === 'members' && (
        <div className="mt-6 space-y-4">
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsInviteOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 cursor-pointer"
            >
              <Share2 className="h-4 w-4 text-purple-600" />
              Invite Friends
            </button>
            <button
              onClick={() => setIsAddMemberOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              Add Friend
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 font-bold text-sm dark:bg-indigo-950 dark:text-indigo-300">
                    {m.displayName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-zinc-900 dark:text-white">
                      {m.displayName}
                    </div>
                    <div className="text-xs text-zinc-400 capitalize">
                      {m.role} {m.isPlaceholder ? '• Placeholder' : '• Registered User'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        groupId={groupId}
        members={members}
        currency={group.currency}
        currentMemberId={currentMember?.id}
        onExpenseAdded={loadAllData}
      />

      <SettleUpModal
        isOpen={isSettleUpOpen}
        onClose={() => setIsSettleUpOpen(false)}
        groupId={groupId}
        members={members}
        currency={group.currency}
        defaultPayerId={settlePayerId}
        defaultPayeeId={settlePayeeId}
        defaultAmountMinor={settleAmount}
        onSettled={loadAllData}
      />

      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        groupId={groupId}
        onMemberAdded={loadAllData}
      />

      <InviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        groupId={groupId}
      />

      <AiExpenseModal
        isOpen={isAiExpenseOpen}
        onClose={() => setIsAiExpenseOpen(false)}
        groupId={groupId}
        groupCurrency={group.currency}
        members={members}
        onExpenseAdded={loadAllData}
      />

      <GroupAssistantModal
        isOpen={isAiAssistantOpen}
        onClose={() => setIsAiAssistantOpen(false)}
        groupId={groupId}
        groupName={group.name}
      />
    </div>
  );
}
