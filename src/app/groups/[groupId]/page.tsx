import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { GroupService } from '@/modules/groups/service';
import { GroupDetailClient } from '@/components/groups/GroupDetailClient';
import Link from 'next/link';
import { ArrowLeft, AlertCircle } from 'lucide-react';

async function GroupPageContent({ params }: { params: Promise<{ groupId: string }> }) {
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
    const { group, members } = await groupService.getGroupWithMembers(user.id, groupId);

    return (
      <GroupDetailClient
        groupId={groupId}
        initialGroup={group}
        initialMembers={members}
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
        <p className="mt-2 text-sm text-zinc-500">
          You may not have permission to view this group or it may not exist.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
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
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            <p className="text-sm font-medium text-zinc-500">Loading group details...</p>
          </div>
        </div>
      }
    >
      <GroupPageContent params={params} />
    </Suspense>
  );
}
