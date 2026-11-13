'use client';

import { useState } from 'react';
import { X, UserPlus, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { ShadowPulseDot } from '@/components/ui/ShadowLoader';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  onMemberAdded: () => void;
}

export function AddMemberModal({
  isOpen,
  onClose,
  groupId,
  onMemberAdded,
}: AddMemberModalProps) {
  const toast = useToast();
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError('Name is required');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName.trim(),
          isPlaceholder: true,
          role: 'member',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add member');
      }

      toast.success(`Added "${displayName.trim()}" to group!`);
      setDisplayName('');
      onMemberAdded();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center bg-black/60 p-0 sm:p-4 backdrop-blur-md transition-all">
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-zinc-200/90 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Mobile Pull Handle */}
        <div className="pt-3 pb-1 flex justify-center sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        </div>

        <div className="flex items-center justify-between border-b border-zinc-100 px-4 sm:px-6 py-3.5 sm:py-4 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm shadow-indigo-500/10 dark:bg-indigo-950 dark:text-indigo-400">
              <UserPlus className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Add Friend / Member
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Add a person to immediately start splitting expenses.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-6 flex-1">
          {error && (
            <div className="mb-4 flex items-center gap-2.5 rounded-xl bg-red-50 p-3.5 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900/50">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p className="font-medium">{error}</p>
            </div>
          )}

          <form id="add-member-form" onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                Friend's Name *
              </label>
              <input
                type="text"
                required
                autoFocus
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Charlie, Sara, David"
                className="block w-full min-h-[44px] rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-base sm:text-sm text-zinc-900 shadow-xs placeholder:text-zinc-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-500 transition-all"
              />
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                You can start splitting bills with them immediately. When they join later via an invite link, they can claim this placeholder member account.
              </p>
            </div>
          </form>
        </div>

        {/* Modal Footer with Safe Area Support */}
        <div className="flex items-center justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800 px-4 sm:px-6 py-3 sm:py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-4 bg-white dark:bg-zinc-900 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="min-h-[44px] rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            form="add-member-form"
            type="submit"
            disabled={loading}
            className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-500 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 disabled:opacity-50 active:scale-[0.98] transition-all cursor-pointer ${
              loading ? 'animate-shadow-pulse pointer-events-none' : ''
            }`}
          >
            {loading ? (
              <>
                <ShadowPulseDot />
                <span>Adding Member...</span>
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                <span>Add Friend</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
