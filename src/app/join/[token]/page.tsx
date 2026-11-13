'use client';

import { useState, use, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Share2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { AuthSkeleton, ShadowPulseDot } from '@/components/ui/ShadowLoader';

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
    <Suspense fallback={<AuthSkeleton />}>
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
      }, 900);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200/80 bg-white p-8 sm:p-10 shadow-xl shadow-zinc-200/40 text-center dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm shadow-indigo-500/10 dark:bg-indigo-950 dark:text-indigo-400">
          <Share2 className="h-8 w-8" />
        </div>

        <h2 className="mt-5 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
          Group Invitation
        </h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
          You have been invited to join an expense sharing group on Pank. Accept the invitation to view balances and split bills together.
        </p>

        {error && (
          <div className="mt-5 flex items-center gap-2.5 rounded-xl bg-red-50 p-3.5 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900/50 text-left">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {success ? (
          <div className="mt-8 flex flex-col items-center gap-3 text-emerald-600 dark:text-emerald-400">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950">
              <CheckCircle2 className="h-8 w-8 animate-scale-check" />
            </div>
            <span className="font-semibold text-sm">Joined group successfully! Redirecting...</span>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            <button
              onClick={handleAccept}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <ShadowPulseDot />
                  <span>Joining group...</span>
                </>
              ) : (
                <>
                  <span>Accept Invitation & Join</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <Link
              href="/"
              className="inline-block text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors"
            >
              Decline and return to home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
