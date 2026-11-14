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
  Bot,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Layers,
  BarChart3
} from 'lucide-react';
import { formatMinorUnits, getCurrencySymbol } from '@/lib/utils';
import { AddExpenseModal } from '@/components/expenses/AddExpenseModal';
import { SettleUpModal } from '@/components/settlements/SettleUpModal';
import { AddMemberModal } from '@/components/groups/AddMemberModal';
import { InviteModal } from '@/components/groups/InviteModal';
import { AiExpenseModal } from '@/components/ai/AiExpenseModal';
import { GroupAssistantModal } from '@/components/ai/GroupAssistantModal';
import { GroupInsightsView } from '@/components/groups/GroupInsightsView';
import { useToast } from '@/components/ui/Toast';
import { ShadowPulseDot } from '@/components/ui/ShadowLoader';

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
  const toast = useToast();
  const [group, setGroup] = useState<GroupData>(initialGroup);
  const [members, setMembers] = useState<MemberData[]>(initialMembers);
  const [expenses, setExpenses] = useState<ExpenseItem[]>(initialExpenses);
  const [balances, setBalances] = useState<BalancesSummary | null>(initialBalances);
  const [settlements, setSettlements] = useState<SettlementItem[]>(initialSettlements);
  const [loadingExtras, setLoadingExtras] = useState(!initialBalances);

  // Active Tab: 'expenses' | 'balances' | 'insights' | 'settlements' | 'members'
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances' | 'insights' | 'settlements' | 'members'>('expenses');
  
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

  // Deletion loading feedback
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [deletingSettlementId, setDeletingSettlementId] = useState<string | null>(null);

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
      toast.error('Failed to refresh latest group data');
    } finally {
      setLoadingExtras(false);
    }
  };

  useEffect(() => {
    if (!initialBalances) {
      loadAllData();
    }
  }, [groupId]);

  const handleDeleteExpense = async (expenseId: string, expenseTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${expenseTitle}"?`)) return;
    setDeletingExpenseId(expenseId);
    try {
      const res = await fetch(`/api/groups/${groupId}/expenses/${expenseId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success(`Deleted expense "${expenseTitle}"`);
        await loadAllData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete expense');
      }
    } catch (err) {
      console.error('Delete expense error:', err);
      toast.error('Failed to delete expense');
    } finally {
      setDeletingExpenseId(null);
    }
  };

  const handleDeleteSettlement = async (settlementId: string) => {
    if (!confirm('Are you sure you want to revert this settlement?')) return;
    setDeletingSettlementId(settlementId);
    try {
      const res = await fetch(`/api/groups/${groupId}/settlements/${settlementId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Settlement reverted and debts restored');
        await loadAllData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to revert settlement');
      }
    } catch (err) {
      console.error('Delete settlement error:', err);
      toast.error('Failed to revert settlement');
    } finally {
      setDeletingSettlementId(null);
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
    <div className="mx-auto max-w-7xl px-3.5 py-5 sm:px-6 sm:py-8 lg:px-8 pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))] sm:pb-8">
      {/* Back button with subtle micro-interaction */}
      <Link
        href="/"
        className="group inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
        Back to All Groups
      </Link>

      {/* Group Header with Strict Visual Hierarchy & Generous Whitespace */}
      <div className="mt-2 sm:mt-4 flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-center lg:justify-between border-b border-zinc-200/80 pb-6 sm:pb-8 dark:border-zinc-800">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <h1 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
              {group.name}
            </h1>
            <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold font-mono text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/60 shadow-2xs">
              {group.currency}
            </span>
          </div>
          {group.description ? (
            <p className="mt-2 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-2xl leading-relaxed">
              {group.description}
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-zinc-400 italic">
              {members.length} members sharing expenses
            </p>
          )}
        </div>

        {/* Action Toolbar with Clear Visual Hierarchy */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Secondary Action: Ask AI */}
          <button
            onClick={() => setIsAiAssistantOpen(true)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 sm:px-3.5 py-2 text-xs font-semibold text-indigo-700 shadow-xs hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/50 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Ask AI</span>
          </button>

          {/* Secondary Action: Settle Up */}
          <button
            onClick={() => {
              setSettlePayerId(undefined);
              setSettlePayeeId(undefined);
              setSettleAmount(undefined);
              setIsSettleUpOpen(true);
            }}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 sm:px-3.5 py-2 text-xs font-semibold text-emerald-800 shadow-xs hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Handshake className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Settle Up</span>
          </button>

          {/* Secondary Action: Invite */}
          <button
            onClick={() => setIsInviteOpen(true)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 sm:px-3.5 py-2 text-xs font-semibold text-zinc-700 shadow-xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-750 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Share2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span>Invite</span>
          </button>

          {/* Primary Action 1: Add Manually */}
          <button
            onClick={() => setIsAddExpenseOpen(true)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3.5 sm:px-4 py-2 text-xs font-bold text-zinc-900 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-750 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Expense</span>
          </button>

          {/* Prominent Primary CTA: Fast AI Add */}
          <button
            onClick={() => setIsAiExpenseOpen(true)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 px-4 sm:px-4.5 py-2 text-xs font-extrabold text-white shadow-md shadow-indigo-600/25 hover:from-indigo-500 hover:to-violet-500 hover:shadow-lg hover:shadow-indigo-600/35 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Sparkles className="h-4 w-4 text-amber-300" />
            <span>Fast AI Add</span>
          </button>
        </div>
      </div>

      {/* Metric Highlights with Generous Padding & Soft Shadows */}
      <div className="mt-6 sm:mt-8 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-3.5 sm:p-5 shadow-sm shadow-zinc-200/50 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none transition-all">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider">Group Total</span>
            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-indigo-500" />
          </div>
          <div className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-extrabold font-mono text-zinc-900 dark:text-white truncate">
            {formatMinorUnits(balances?.totalGroupSpending || 0, group.currency)}
          </div>
          <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-[11px] text-zinc-400 truncate">Total group spending</p>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-3.5 sm:p-5 shadow-sm shadow-zinc-200/50 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none transition-all">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider">Expenses</span>
            <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-500" />
          </div>
          <div className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-extrabold font-mono text-zinc-900 dark:text-white">
            {expenses.length}
          </div>
          <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-[11px] text-zinc-400">Logged bills</p>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-3.5 sm:p-5 shadow-sm shadow-zinc-200/50 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none transition-all">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider">Members</span>
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
          </div>
          <div className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-extrabold font-mono text-zinc-900 dark:text-white">
            {members.length}
          </div>
          <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-[11px] text-zinc-400">Participants</p>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-3.5 sm:p-5 shadow-sm shadow-zinc-200/50 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none transition-all">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider">Active Debts</span>
            <Scale className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500" />
          </div>
          <div className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-extrabold font-mono text-indigo-600 dark:text-indigo-400">
            {balances?.simplifiedDebts.length || 0}
          </div>
          <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-[11px] text-zinc-400">Simplified paths</p>
        </div>
      </div>

      {/* Solo Member Onboarding Guidance Notice */}
      {members.length <= 1 && (
        <div className="mt-6 sm:mt-8 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 sm:p-5 dark:border-indigo-900/60 dark:bg-indigo-950/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm shadow-indigo-500/5">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 shadow-2xs">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                You're the only member in this group!
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 leading-relaxed">
                Add friends or create placeholder members to split shared bills and track balances together.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsAddMemberOpen(true)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 active:scale-[0.98] transition-all cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Add Friend</span>
            </button>
            <button
              onClick={() => setIsInviteOpen(true)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3.5 py-2 text-xs font-semibold text-indigo-700 shadow-2xs hover:bg-indigo-50 dark:border-indigo-800 dark:bg-zinc-900 dark:text-indigo-300 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Share2 className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              <span>Invite</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation with Clear Active State, Touch Scroll & Whitespace */}
      <div className="mt-8 sm:mt-10 border-b border-zinc-200 dark:border-zinc-800">
        <nav className="flex space-x-2 sm:space-x-8 overflow-x-auto no-scrollbar py-1 -mb-px">
          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex min-h-[44px] items-center gap-2 border-b-2 px-2 sm:px-1 pb-3 text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'expenses'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Receipt className="h-4 w-4" />
            <span>Expenses</span>
            <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-mono">
              {expenses.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('balances')}
            className={`flex min-h-[44px] items-center gap-2 border-b-2 px-2 sm:px-1 pb-3 text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'balances'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Scale className="h-4 w-4" />
            <span>Balances<span className="hidden sm:inline"> & Simplified Debts</span></span>
            {(balances?.simplifiedDebts.length || 0) > 0 && (
              <span className="rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 px-2 py-0.5 text-xs font-mono font-bold">
                {balances?.simplifiedDebts.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('insights')}
            className={`flex min-h-[44px] items-center gap-2 border-b-2 px-2 sm:px-1 pb-3 text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'insights'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Insights</span>
          </button>

          <button
            onClick={() => setActiveTab('settlements')}
            className={`flex min-h-[44px] items-center gap-2 border-b-2 px-2 sm:px-1 pb-3 text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'settlements'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Handshake className="h-4 w-4" />
            <span>Settlements</span>
            <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-mono">
              {settlements.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`flex min-h-[44px] items-center gap-2 border-b-2 px-2 sm:px-1 pb-3 text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'members'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Members</span>
            <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-mono">
              {members.length}
            </span>
          </button>
        </nav>
      </div>

      {/* TAB 1: EXPENSES */}
      {activeTab === 'expenses' && (
        <div className="mt-6 sm:mt-8 space-y-3.5 sm:space-y-4">
          {loadingExtras && expenses.length === 0 ? (
            /* Shadow Skeleton for loading instead of spinner */
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-zinc-200/70 bg-white p-4 sm:p-5 shadow-sm shadow-zinc-200/40 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-11 w-11 rounded-xl skeleton-shimmer shadow-xs" />
                      <div className="space-y-2">
                        <div className="h-4 w-40 rounded skeleton-shimmer" />
                        <div className="h-3 w-56 rounded skeleton-shimmer" />
                      </div>
                    </div>
                    <div className="h-6 w-24 rounded-lg skeleton-shimmer shadow-xs" />
                  </div>
                </div>
              ))}
            </div>
          ) : expenses.length === 0 ? (
            /* Optimized Empty State with Clear CTAs */
            <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-14 text-center shadow-lg shadow-zinc-200/40 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
              <div className="mx-auto flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm shadow-indigo-500/10 dark:bg-indigo-950 dark:text-indigo-400">
                <Receipt className="h-7 w-7 sm:h-8 sm:w-8" />
              </div>
              <h3 className="mt-5 sm:mt-6 text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                No expenses logged yet
              </h3>
              <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Record your first bill to see the deterministic accounting engine split expenses, calculate pairwise debts, and update balances.
              </p>

              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => setIsAiExpenseOpen(true)}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/25 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.98] transition-all cursor-pointer w-full sm:w-auto"
                >
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  <span>Scan Receipt / Fast AI Add</span>
                </button>
                <button
                  onClick={() => setIsAddExpenseOpen(true)}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-5 py-2.5 text-xs font-bold text-zinc-800 shadow-xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 active:scale-[0.98] transition-all cursor-pointer w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Manually</span>
                </button>
              </div>
            </div>
          ) : (
            expenses.map((expense) => {
              const isExpanded = expandedExpenseId === expense.id;
              const primaryPayer = expense.payments[0];
              const payerName = primaryPayer ? getMemberName(primaryPayer.groupMemberId) : 'Unknown';

              return (
                <div
                  key={expense.id}
                  className="rounded-2xl border border-zinc-200/80 bg-white p-4 sm:p-5 shadow-sm shadow-zinc-200/30 hover:-translate-y-0.5 hover:shadow-md hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 transition-all duration-200"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 shadow-2xs">
                        <Receipt className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2 sm:hidden">
                          <h4 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                            {expense.title}
                          </h4>
                          <div className="text-base font-bold font-mono text-zinc-900 dark:text-white shrink-0">
                            {formatMinorUnits(expense.amount, expense.currency)}
                          </div>
                        </div>
                        <h4 className="hidden sm:block text-base font-bold text-zinc-900 dark:text-white">
                          {expense.title}
                        </h4>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-zinc-500">
                          <span className="flex items-center gap-1 font-medium">
                            <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                            {expense.expenseDate}
                          </span>
                          <span>•</span>
                          <span>
                            Paid by <strong className="font-semibold text-zinc-800 dark:text-zinc-200">{payerName}</strong>
                          </span>
                          <span>•</span>
                          <span className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-1.5 sm:px-2 py-0.5 font-medium text-zinc-600 dark:text-zinc-300 capitalize text-[10px] sm:text-[11px]">
                            {expense.splitType} split
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 pt-2 sm:pt-0 border-t border-zinc-100 sm:border-t-0 dark:border-zinc-800/60">
                      <div className="text-left sm:text-right">
                        <div className="hidden sm:block text-lg font-bold font-mono text-zinc-900 dark:text-white">
                          {formatMinorUnits(expense.amount, expense.currency)}
                        </div>
                        <div className="text-xs text-zinc-400">
                          {expense.splits.length} {expense.splits.length === 1 ? 'participant' : 'participants'}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <button
                          onClick={() => setExpandedExpenseId(isExpanded ? null : expense.id)}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 active:scale-[0.95] transition-all cursor-pointer"
                          title={isExpanded ? 'Hide split breakdown' : 'Show split breakdown'}
                          aria-label={isExpanded ? 'Hide split breakdown' : 'Show split breakdown'}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>

                        <button
                          onClick={() => handleDeleteExpense(expense.id, expense.title)}
                          disabled={deletingExpenseId === expense.id}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400 disabled:opacity-50 active:scale-[0.95] transition-all cursor-pointer"
                          title="Delete expense"
                          aria-label="Delete expense"
                        >
                          {deletingExpenseId === expense.id ? (
                            <ShadowPulseDot variant="primary" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expandable splits breakdown */}
                  {isExpanded && (
                    <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800/80">
                      <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2.5">
                        Participant Split Breakdown
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {expense.splits.map((s) => (
                          <div
                            key={s.id || s.groupMemberId}
                            className="flex items-center justify-between rounded-xl bg-zinc-50/80 px-3.5 py-2 text-xs border border-zinc-100 dark:border-zinc-800 dark:bg-zinc-850/60 min-h-[38px]"
                          >
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                              {getMemberName(s.groupMemberId)}
                            </span>
                            <span className="font-mono font-bold text-zinc-900 dark:text-white">
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

      {/* TAB 2: BALANCES & SIMPLIFIED DEBTS */}
      {activeTab === 'balances' && (
        <div className="mt-6 sm:mt-8 space-y-8 sm:space-y-10">
          {/* Simplified Pairwise Debts */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
                  Simplified Debts (Minimum Transactions)
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Greedy cash-flow reduction eliminates redundant circular payment cycles.
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700 font-bold dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 w-fit">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Zero-sum Paired Math Guaranteed</span>
              </div>
            </div>

            {loadingExtras && !balances ? (
              /* Shadow skeleton */
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[1, 2].map((i) => (
                  <div key={i} className="rounded-2xl border border-zinc-200/70 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 skeleton-shimmer">
                    <div className="h-12 rounded-xl" />
                  </div>
                ))}
              </div>
            ) : balances?.simplifiedDebts.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-emerald-200/70 bg-emerald-50/40 p-6 sm:p-8 text-center dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-300">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h4 className="mt-3 text-base font-bold text-zinc-900 dark:text-white">
                  All Debts Settled!
                </h4>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  There are no outstanding debts between members in this group.
                </p>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3.5 sm:gap-4 sm:grid-cols-2">
                {balances?.simplifiedDebts.map((debt, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-white p-4 sm:p-5 shadow-sm shadow-zinc-200/30 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 transition-all"
                  >
                    <div>
                      <div className="text-sm text-zinc-800 dark:text-zinc-200 font-medium">
                        <strong className="text-red-600 dark:text-red-400 font-bold">{debt.fromDisplayName}</strong>
                        {' owes '}
                        <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{debt.toDisplayName}</strong>
                      </div>
                      <div className="mt-1 sm:mt-1.5 text-xl font-extrabold font-mono text-zinc-900 dark:text-white">
                        {formatMinorUnits(debt.amount, debt.currency)}
                      </div>
                    </div>

                    <button
                      onClick={() => openQuickSettle(debt.fromMemberId, debt.toMemberId, debt.amount)}
                      className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-500 active:scale-[0.98] transition-all cursor-pointer w-full sm:w-auto shrink-0"
                    >
                      <Handshake className="h-4 w-4" />
                      <span>Settle Up</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Member Net Balances: Card-based on mobile, Table on desktop */}
          <div>
            <h3 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
              Member Net Balances
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 mb-4">
              Total paid into expenses vs total share of expenses per member.
            </p>

            {/* Mobile Card-Based Balance List (sm:hidden) */}
            <div className="sm:hidden space-y-3">
              {balances && Object.values(balances.balances).map((mb) => {
                const isPositive = mb.netBalance > 0;
                const isZero = mb.netBalance === 0;

                return (
                  <div
                    key={mb.memberId}
                    className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 font-bold text-xs text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 shadow-2xs">
                          {mb.displayName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                            {mb.displayName}
                          </div>
                          {mb.isPlaceholder && (
                            <span className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                              Placeholder
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        {isZero ? (
                          <span className="inline-flex items-center rounded-lg bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-xs font-mono font-semibold text-zinc-500">
                            Settled (0.00)
                          </span>
                        ) : isPositive ? (
                          <span className="inline-flex items-center rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/50 px-2.5 py-1 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300">
                            +{formatMinorUnits(mb.netBalance, group.currency)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/50 px-2.5 py-1 text-xs font-mono font-bold text-red-700 dark:text-red-300">
                            {formatMinorUnits(mb.netBalance, group.currency)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 text-xs">
                      <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/40 p-2.5">
                        <span className="text-[10px] uppercase font-semibold text-zinc-400 block tracking-wider">Total Paid</span>
                        <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200 mt-0.5 block text-xs">
                          {formatMinorUnits(mb.totalPaid, group.currency)}
                        </span>
                      </div>
                      <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/40 p-2.5">
                        <span className="text-[10px] uppercase font-semibold text-zinc-400 block tracking-wider">Share Owed</span>
                        <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200 mt-0.5 block text-xs">
                          {formatMinorUnits(mb.totalOwed, group.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table (hidden sm:block) */}
            <div className="hidden sm:block overflow-x-auto rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <table className="min-w-full divide-y divide-zinc-200 text-left text-sm dark:divide-zinc-800">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-xs font-bold uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="px-5 py-3.5">Member</th>
                    <th className="px-5 py-3.5">Total Paid</th>
                    <th className="px-5 py-3.5">Total Share Owed</th>
                    <th className="px-5 py-3.5 text-right">Net Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {balances && Object.values(balances.balances).map((mb) => {
                    const isPositive = mb.netBalance > 0;
                    const isZero = mb.netBalance === 0;

                    return (
                      <tr key={mb.memberId} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="px-5 py-4 font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                          <span>{mb.displayName}</span>
                          {mb.isPlaceholder && (
                            <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800">
                              Placeholder
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 font-mono font-medium text-zinc-600 dark:text-zinc-400">
                          {formatMinorUnits(mb.totalPaid, group.currency)}
                        </td>
                        <td className="px-5 py-4 font-mono font-medium text-zinc-600 dark:text-zinc-400">
                          {formatMinorUnits(mb.totalOwed, group.currency)}
                        </td>
                        <td className="px-5 py-4 text-right font-mono font-bold text-sm">
                          {isZero ? (
                            <span className="text-zinc-400 font-medium">Settled (0.00)</span>
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

      {/* TAB: INSIGHTS */}
      {activeTab === 'insights' && (
        <GroupInsightsView
          groupId={groupId}
          currency={group.currency}
          currentUserId={currentUserId}
          onAddExpense={() => setIsAddExpenseOpen(true)}
        />
      )}

      {/* TAB 3: SETTLEMENTS */}
      {activeTab === 'settlements' && (
        <div className="mt-6 sm:mt-8 space-y-4 sm:space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
                Settled Payments
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Payments made between members to reconcile balances.
              </p>
            </div>
            <button
              onClick={() => {
                setSettlePayerId(undefined);
                setSettlePayeeId(undefined);
                setSettleAmount(undefined);
                setIsSettleUpOpen(true);
              }}
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-500 active:scale-[0.98] transition-all cursor-pointer w-full sm:w-auto"
            >
              <Handshake className="h-4 w-4" />
              <span>Record Settlement</span>
            </button>
          </div>

          {loadingExtras && settlements.length === 0 ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-2xl border border-zinc-200/70 bg-white p-4 sm:p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 skeleton-shimmer">
                  <div className="h-10 w-full" />
                </div>
              ))}
            </div>
          ) : settlements.length === 0 ? (
            <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-14 text-center shadow-lg shadow-zinc-200/40 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
              <div className="mx-auto flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                <Handshake className="h-7 w-7 sm:h-8 sm:w-8" />
              </div>
              <h3 className="mt-5 sm:mt-6 text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                No settlements recorded yet
              </h3>
              <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                When someone repays a friend via UPI, cash, or bank transfer, record it here to offset debts.
              </p>
              <button
                onClick={() => {
                  setSettlePayerId(undefined);
                  setSettlePayeeId(undefined);
                  setSettleAmount(undefined);
                  setIsSettleUpOpen(true);
                }}
                className="mt-6 inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 active:scale-[0.98] transition-all cursor-pointer w-full sm:w-auto"
              >
                <Handshake className="h-4 w-4" />
                <span>Record First Settlement</span>
              </button>
            </div>
          ) : (
            settlements.map((s) => (
              <div
                key={s.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-white p-4 sm:p-5 shadow-sm shadow-zinc-200/30 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 transition-all"
              >
                <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                  <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                    <Handshake className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                      <strong>{getMemberName(s.payerMemberId)}</strong> paid <strong>{getMemberName(s.payeeMemberId)}</strong>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-zinc-500">
                      <span>{new Date(s.settledAt).toLocaleDateString()}</span>
                      {s.paymentMethod && <span>• {s.paymentMethod}</span>}
                      {s.notes && <span>• &ldquo;{s.notes}&rdquo;</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t border-zinc-100 sm:border-t-0 dark:border-zinc-800/60">
                  <span className="font-mono font-bold text-base sm:text-lg text-emerald-600 dark:text-emerald-400">
                    {formatMinorUnits(s.amount, s.currency)}
                  </span>
                  <button
                    onClick={() => handleDeleteSettlement(s.id)}
                    disabled={deletingSettlementId === s.id}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 dark:hover:text-red-400 disabled:opacity-50 active:scale-[0.95] transition-all cursor-pointer"
                    title="Revert settlement"
                    aria-label="Revert settlement"
                  >
                    {deletingSettlementId === s.id ? (
                      <ShadowPulseDot variant="primary" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 4: MEMBERS */}
      {activeTab === 'members' && (
        <div className="mt-6 sm:mt-8 space-y-5 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
                Group Members ({members.length})
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Friends in this group who participate in bill splitting.
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-2.5">
              <button
                onClick={() => setIsInviteOpen(true)}
                className="inline-flex min-h-[44px] flex-1 sm:flex-none justify-center items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 shadow-xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Share2 className="h-4 w-4 text-purple-600" />
                <span>Invite Friends</span>
              </button>
              <button
                onClick={() => setIsAddMemberOpen(true)}
                className="inline-flex min-h-[44px] flex-1 sm:flex-none justify-center items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 active:scale-[0.98] transition-all cursor-pointer"
              >
                <UserPlus className="h-4 w-4" />
                <span>Add Friend</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-2xl border border-zinc-200/80 bg-white p-4 sm:p-5 shadow-sm shadow-zinc-200/30 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 font-bold text-sm dark:bg-indigo-950 dark:text-indigo-300 shadow-2xs">
                    {m.displayName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-zinc-900 dark:text-white">
                      {m.displayName}
                    </div>
                    <div className="text-xs text-zinc-400 capitalize mt-0.5">
                      {m.role} {m.isPlaceholder ? '• Placeholder' : '• Registered User'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sticky Mobile Bottom Action Bar (Thumb-friendly CTA actions) */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-zinc-950/95 border-t border-zinc-200/90 dark:border-zinc-800/90 px-3 py-2.5 pb-[calc(0.6rem+env(safe-area-inset-bottom,0px))] backdrop-blur-md shadow-lg flex items-center justify-between gap-2">
        <button
          onClick={() => setIsAiExpenseOpen(true)}
          className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 px-3 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/20 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Sparkles className="h-4 w-4 text-amber-300 shrink-0" />
          <span className="truncate">Fast AI Add</span>
        </button>

        <button
          onClick={() => setIsAddExpenseOpen(true)}
          className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-900 dark:text-white shadow-xs active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span className="truncate">Add Expense</span>
        </button>

        <button
          onClick={() => {
            setSettlePayerId(undefined);
            setSettlePayeeId(undefined);
            setSettleAmount(undefined);
            setIsSettleUpOpen(true);
          }}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300 active:scale-[0.98] transition-all cursor-pointer"
          title="Settle Up"
          aria-label="Settle Up"
        >
          <Handshake className="h-4 w-4" />
        </button>

        <button
          onClick={() => setIsAiAssistantOpen(true)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/50 dark:text-indigo-300 active:scale-[0.98] transition-all cursor-pointer"
          title="Ask AI"
          aria-label="Ask AI"
        >
          <Bot className="h-4 w-4" />
        </button>
      </div>

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
