'use client';

import { useState } from 'react';
import { X, Share2, Copy, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { ShadowPulseDot } from '@/components/ui/ShadowLoader';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
}

export function InviteModal({ isOpen, onClose, groupId }: InviteModalProps) {
  const toast = useToast();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateInvite = async () => {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/groups/${groupId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expiresInDays: 7,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate invitation');
      }

      const token = data.invitation.token;
      const url = `${window.location.origin}/join/${token}`;
      setInviteUrl(url);
      toast.success('Shareable invite link generated!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success('Invite link copied to clipboard!');
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center bg-black/60 p-0 sm:p-4 backdrop-blur-md transition-all"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-zinc-200/90 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Handle */}
        <div className="pt-3 pb-1 flex justify-center sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        </div>

        <div className="flex items-center justify-between border-b border-zinc-200 px-4 sm:px-6 py-3.5 sm:py-4 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 shadow-sm shadow-purple-500/10 dark:bg-purple-950 dark:text-purple-400">
              <Share2 className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Invite Friends
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Share a link to let friends join and split expenses.
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

        <div className="overflow-y-auto p-4 sm:p-6 flex-1 space-y-4 sm:space-y-5">
          {error && (
            <div className="flex items-center gap-2.5 rounded-xl bg-red-50 p-3.5 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900/50">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p className="font-medium">{error}</p>
            </div>
          )}

          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Generate a secure, shareable invite link valid for 7 days. Anyone with this link can join this group and claim their placeholder member name.
          </p>

          {!inviteUrl ? (
            <button
              onClick={handleGenerateInvite}
              disabled={loading}
              className={`flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-purple-600/25 hover:bg-purple-500 hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer ${
                loading ? 'animate-shadow-pulse pointer-events-none' : ''
              }`}
            >
              {loading ? (
                <>
                  <ShadowPulseDot />
                  <span>Generating Secure Link...</span>
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" />
                  <span>Create Shareable Invite Link</span>
                </>
              )}
            </button>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Shareable Link (Valid for 7 days)
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteUrl}
                  className="block w-full min-h-[44px] rounded-xl border border-zinc-300 bg-zinc-50 px-3.5 py-2.5 text-base sm:text-xs font-mono text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 select-all"
                />
                <button
                  onClick={handleCopy}
                  className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 active:scale-[0.98] transition-all shrink-0 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-300 animate-scale-check" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Safe Area Support */}
        <div className="flex items-center justify-end border-t border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 py-3 sm:py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-4 bg-white dark:bg-zinc-900 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-xl px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
