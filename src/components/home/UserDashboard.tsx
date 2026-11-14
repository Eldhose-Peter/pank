'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Users, 
  Receipt, 
  Calculator, 
  CheckCircle2, 
  Sparkles, 
  ChevronRight,
  ArrowRight,
  Split,
  ShieldCheck,
  Zap,
  BarChart3
} from 'lucide-react';
import { CreateGroupModal } from '@/components/groups/CreateGroupModal';
import { UserInsightsView } from '@/components/home/UserInsightsView';
import { useToast } from '@/components/ui/Toast';

interface GroupItem {
  id: string;
  name: string;
  description?: string | null;
  currency: string;
  createdAt?: string;
  created_at?: string;
}

interface UserDashboardProps {
  user: {
    id: string;
    email: string;
    fullName: string;
  };
  initialGroups: GroupItem[];
}

export function UserDashboard({ user, initialGroups }: UserDashboardProps) {
  const router = useRouter();
  const toast = useToast();
  const [groups, setGroups] = useState<GroupItem[]>(initialGroups);
  const [dashboardTab, setDashboardTab] = useState<'groups' | 'insights'>('groups');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [initialGroupName, setInitialGroupName] = useState('');

  const handleGroupCreated = (newGroup: any) => {
    setGroups((prev) => [newGroup, ...prev]);
    toast.success(`Group "${newGroup.name}" created!`, 'Success');
    router.push(`/groups/${newGroup.id}`);
  };

  const handleQuickCreate = (presetName: string) => {
    setInitialGroupName(presetName);
    setIsCreateModalOpen(true);
  };

  return (
    <div className="mx-auto max-w-7xl px-3.5 py-6 sm:px-6 sm:py-10 lg:px-8">
      {/* Header with Visual Hierarchy & Negative Space */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200/80 pb-6 sm:pb-8 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            Dashboard Overview
          </div>
          <h1 className="mt-2 text-2xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Welcome back, {user.fullName}
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-2xl leading-relaxed">
            Manage your shared expenses, track live balances, and settle debts with deterministic zero-sum precision.
          </p>
        </div>

        <button
          onClick={() => {
            setInitialGroupName('');
            setIsCreateModalOpen(true);
          }}
          className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-600/30 active:scale-[0.98] transition-all shrink-0 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Create New Group
        </button>
      </div>

      {/* Metric Cards with generous internal whitespace & soft shadows */}
      <div className="mt-6 sm:mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4.5 sm:p-6 shadow-sm shadow-zinc-200/50 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none transition-all duration-200">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Groups</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4 text-2xl sm:text-3xl font-extrabold font-mono text-zinc-900 dark:text-white">
            {groups.length}
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Shared expense ledgers
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4.5 sm:p-6 shadow-sm shadow-zinc-200/50 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none transition-all duration-200">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Accounting Engine</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <Calculator className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4 flex items-center gap-1.5 text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Deterministic 64-bit Paired Math</span>
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Zero-sum guarantee: &Sigma; NetBalance = 0
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4.5 sm:p-6 shadow-sm shadow-zinc-200/50 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none transition-all duration-200">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">AI Copilot</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4 flex items-center gap-1.5 text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
            <Zap className="h-4 w-4 text-purple-500" />
            <span>Gemini 2.5 Flash Multimodal</span>
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Receipt scanning, audio parse & financial Q&A
          </p>
        </div>
      </div>

      {/* Segmented Dashboard Navigation: My Groups vs Spending Insights */}
      <div className="mt-10 sm:mt-12 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex space-x-4 sm:space-x-8">
          <button
            onClick={() => setDashboardTab('groups')}
            className={`flex min-h-[44px] items-center gap-2 border-b-2 px-2 sm:px-1 pb-3 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              dashboardTab === 'groups'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>My Groups</span>
            <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-mono">
              {groups.length}
            </span>
          </button>

          <button
            onClick={() => setDashboardTab('insights')}
            className={`flex min-h-[44px] items-center gap-2 border-b-2 px-2 sm:px-1 pb-3 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              dashboardTab === 'insights'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <BarChart3 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Spending Insights</span>
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
          </button>
        </div>
      </div>

      {/* DASHBOARD TAB 1: GROUPS LIST */}
      {dashboardTab === 'groups' && (
        <div className="mt-8 sm:mt-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Your Expense Groups
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Select a group to log bills, view pairwise debts, or settle up.
              </p>
            </div>
            <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-600 dark:text-zinc-300 font-mono">
              {groups.length} {groups.length === 1 ? 'group' : 'groups'}
            </span>
          </div>

          {groups.length === 0 ? (
            /* Optimized Onboarding & Empty State */
            <div className="mt-6 rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-14 shadow-lg shadow-zinc-200/40 text-center dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
              <div className="mx-auto flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25">
                <Receipt className="h-7 w-7 sm:h-8 sm:w-8" />
              </div>

              <h3 className="mt-5 sm:mt-6 text-lg sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Start Your First Expense Group
              </h3>
              <p className="mx-auto mt-2 max-w-lg text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Create a shared space for your trip, apartment, or outing. Track multi-payer bills, custom splits, and let our engine calculate minimal transactions to settle up.
              </p>

              {/* 3 Step Visual Guide */}
              <div className="mx-auto mt-6 sm:mt-8 grid max-w-3xl grid-cols-1 gap-3 sm:gap-4 text-left sm:grid-cols-3">
                <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-4 dark:border-zinc-800/60 dark:bg-zinc-800/40">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 font-bold text-xs dark:bg-indigo-950 dark:text-indigo-300">
                    1
                  </div>
                  <h4 className="mt-3 text-xs font-bold text-zinc-900 dark:text-white">
                    Create a Group
                  </h4>
                  <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal">
                    Give it a name and select your currency (INR, USD, EUR, etc).
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-4 dark:border-zinc-800/60 dark:bg-zinc-800/40">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 text-purple-700 font-bold text-xs dark:bg-purple-950 dark:text-purple-300">
                    2
                  </div>
                  <h4 className="mt-3 text-xs font-bold text-zinc-900 dark:text-white">
                    Add Friends
                  </h4>
                  <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal">
                    Add placeholder friends immediately or share an invite link.
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-4 dark:border-zinc-800/60 dark:bg-zinc-800/40">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-bold text-xs dark:bg-emerald-950 dark:text-emerald-300">
                    3
                  </div>
                  <h4 className="mt-3 text-xs font-bold text-zinc-900 dark:text-white">
                    Split & Settle
                  </h4>
                  <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal">
                    Use Gemini AI or manual entry. View simplified debts and settle up.
                  </p>
                </div>
              </div>

              {/* Quick Inspiration Pills */}
              <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-2 text-xs">
                <span className="font-medium text-zinc-500 dark:text-zinc-400 w-full sm:w-auto text-center">Quick ideas:</span>
                {[
                  { label: '🏖️ Goa Vacation', preset: 'Goa Vacation 2026' },
                  { label: '🏠 Flat 402 Rent & Bills', preset: 'Flat 402 Expenses' },
                  { label: '🍽️ Weekend Dinner Club', preset: 'Weekend Dinners' },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickCreate(item.preset)}
                    className="inline-flex min-h-[44px] items-center rounded-full border border-zinc-200 bg-white px-3.5 py-2 font-medium text-zinc-700 hover:border-indigo-400 hover:text-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-indigo-500 transition-colors cursor-pointer shadow-2xs"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="mt-6 sm:mt-8 flex justify-center">
                <button
                  onClick={() => {
                    setInitialGroupName('');
                    setIsCreateModalOpen(true);
                  }}
                  className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-500 hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Create Your First Group
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => (
                <Link
                  key={group.id}
                  href={`/groups/${group.id}`}
                  className="group relative flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-5 sm:p-6 shadow-sm shadow-zinc-200/40 hover:-translate-y-1 hover:border-indigo-500/80 hover:shadow-xl hover:shadow-indigo-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-500 transition-all duration-200 min-h-[140px]"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold font-mono text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50">
                        {group.currency}
                      </span>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-50 group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:bg-zinc-800 dark:group-hover:bg-indigo-950/80 dark:group-hover:text-indigo-400 text-zinc-400 transition-colors">
                        <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>

                    <h3 className="mt-3 sm:mt-4 text-base sm:text-lg font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {group.name}
                    </h3>
                    {group.description ? (
                      <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                        {group.description}
                      </p>
                    ) : (
                      <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 italic">
                        No description provided
                      </p>
                    )}
                  </div>

                  <div className="mt-6 sm:mt-8 flex items-center justify-between border-t border-zinc-200/80 pt-3.5 sm:pt-4 text-xs text-zinc-500 dark:border-zinc-800">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                      View Ledger & Splits
                    </span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:underline">
                      Open <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DASHBOARD TAB 2: GLOBAL SPENDING INSIGHTS */}
      {dashboardTab === 'insights' && (
        <UserInsightsView
          user={user}
          onCreateGroup={() => {
            setInitialGroupName('');
            setIsCreateModalOpen(true);
          }}
        />
      )}

      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        initialName={initialGroupName}
        onCreated={handleGroupCreated}
      />
    </div>
  );
}
