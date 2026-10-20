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
  ChevronRight 
} from 'lucide-react';
import { CreateGroupModal } from '@/components/groups/CreateGroupModal';

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
  const [groups, setGroups] = useState<GroupItem[]>(initialGroups);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleGroupCreated = (newGroup: any) => {
    setGroups((prev) => [newGroup, ...prev]);
    router.push(`/groups/${newGroup.id}`);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
            Welcome, {user.fullName}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage your shared expenses, track balances, and settle debts with deterministic precision.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors shrink-0 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Create New Group
        </button>
      </div>

      {/* Metric Cards */}
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Groups</span>
            <Users className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">
            {groups.length}
          </div>
          <p className="mt-1 text-xs text-zinc-500">Expense sharing spaces</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Accounting Engine</span>
            <Calculator className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            Deterministic 64-bit Paired Math
          </div>
          <p className="mt-1 text-xs text-zinc-500">Zero-sum balance guarantee</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">AI Assistant</span>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-sm font-bold text-zinc-900 dark:text-white">
            Phase 3 Ready
          </div>
          <p className="mt-1 text-xs text-zinc-500">Conversational natural language input</p>
        </div>
      </div>

      {/* Groups List */}
      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Your Groups</h2>
          <span className="text-xs text-zinc-500">{groups.length} total</span>
        </div>

        {groups.length === 0 ? (
          <div className="mt-4 rounded-2xl border-2 border-dashed border-zinc-200 p-12 text-center dark:border-zinc-800">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <Receipt className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-white">No groups yet</h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Get started by creating a group for your trip, housemates, or dinner outing.
            </p>
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Create Your First Group
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                className="group relative flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm hover:border-indigo-500 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-500 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300">
                      {group.currency}
                    </span>
                    <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                  </div>

                  <h3 className="mt-3 text-lg font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {group.name}
                  </h3>
                  {group.description && (
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                      {group.description}
                    </p>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs text-zinc-500 dark:border-zinc-800">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-zinc-400" />
                    View Members & Expenses
                  </span>
                  <span className="font-medium text-indigo-600 dark:text-indigo-400">Open &rarr;</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleGroupCreated}
      />
    </div>
  );
}
