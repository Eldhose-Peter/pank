'use client';

import { useState, use, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Share2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

function JoinGroupResolved({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  return <JoinGroupContent token={resolvedParams.token} />;
}

export default function JoinGroupPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center text-sm text-zinc-500">
          Loading invitation...
        </div>
      }
    >
      <JoinGroupResolved params={params} />
    </Suspense>
  );
}

function JoinGroupContent({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleAccept = async () => {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/invitations/${token}/accept`, {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to accept invitation');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/groups/${data.groupId}`);
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm text-center dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
          <Share2 className="h-7 w-7" />
        </div>

        <h2 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
          Group Invitation
        </h2>
        <p className="mt-2 text-sm text-zinc-500">
          You have been invited to join an expense sharing group on Pank.
        </p>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300 text-left">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {success ? (
          <div className="mt-6 flex flex-col items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-8 w-8" />
            <span className="font-semibold text-sm">Joined group successfully! Redirecting...</span>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <button
              onClick={handleAccept}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors disabled:opacity-50"
            >
              {loading ? 'Joining group...' : 'Accept Invitation & Join'}
              <ArrowRight className="h-4 w-4" />
            </button>

            <Link
              href="/"
              className="block text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Decline and return to home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
