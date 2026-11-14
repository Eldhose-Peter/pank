import { Suspense } from 'react';
import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { GroupService } from '@/modules/groups/service';
import { ExpenseService } from '@/modules/expenses/service';
import { BalanceService } from '@/modules/accounting/service';
import { SettlementService } from '@/modules/settlements/service';
import { GroupDetailClient } from '@/components/groups/GroupDetailClient';
import { GroupDetailSkeleton } from '@/components/ui/ShadowLoader';
import Link from 'next/link';
import { ArrowLeft, AlertCircle } from 'lucide-react';

async function GroupPageContent({ params }: { params: Promise<{ groupId: string }> }) {
  await connection();
  const { groupId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=/groups/${groupId}`);
  }

  try {
    const groupService = new GroupService(supabase);
    const expenseService = new ExpenseService(supabase);
    const balanceService = new BalanceService(supabase);
    const settlementService = new SettlementService(supabase);

    const [{ group, members }, expenses, balances, settlements] = await Promise.all([
      groupService.getGroupWithMembers(user.id, groupId),
      expenseService.getExpenses(user.id, groupId),
      balanceService.getGroupBalances(user.id, groupId),
      settlementService.getSettlements(user.id, groupId),
    ]);

    return (
      <GroupDetailClient
        key={groupId}
        groupId={groupId}
        initialGroup={group}
        initialMembers={members}
        initialExpenses={expenses}
        initialBalances={balances}
        initialSettlements={settlements}
        currentUserId={user.id}
      />
    );
  } catch (err: any) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-zinc-900 dark:text-white">
          {err.message || 'Group not found'}
        </h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          You may not have permission to view this group or it may not exist.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 active:scale-[0.98] transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
    );
  }
}

export default function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  return (
    <Suspense fallback={<GroupDetailSkeleton />}>
      <GroupPageContent params={params} />
    </Suspense>
  );
}
