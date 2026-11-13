'use client';

import { useState, useEffect } from 'react';
import { X, Handshake, AlertCircle } from 'lucide-react';
import { getCurrencySymbol } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { ShadowPulseDot } from '@/components/ui/ShadowLoader';

interface GroupMember {
  id: string;
  displayName: string;
  userId?: string | null;
}

interface SettleUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  members: GroupMember[];
  currency: string;
  defaultPayerId?: string;
  defaultPayeeId?: string;
  defaultAmountMinor?: number;
  onSettled: () => void;
}

export function SettleUpModal({
  isOpen,
  onClose,
  groupId,
  members,
  currency,
  defaultPayerId,
  defaultPayeeId,
  defaultAmountMinor,
  onSettled,
}: SettleUpModalProps) {
  const toast = useToast();
  const [payerMemberId, setPayerMemberId] = useState(defaultPayerId || members[0]?.id || '');
  const [payeeMemberId, setPayeeMemberId] = useState(
    defaultPayeeId || members.find((m) => m.id !== (defaultPayerId || members[0]?.id))?.id || ''
  );
  const [amountInput, setAmountInput] = useState(
    defaultAmountMinor ? (defaultAmountMinor / 100).toFixed(2) : ''
  );
  const [paymentMethod, setPaymentMethod] = useState('UPI / Cash');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPayerMemberId(defaultPayerId || members[0]?.id || '');
      setPayeeMemberId(
        defaultPayeeId || members.find((m) => m.id !== (defaultPayerId || members[0]?.id))?.id || ''
      );
      setAmountInput(
        defaultAmountMinor !== undefined ? (defaultAmountMinor / 100).toFixed(2) : ''
      );
      setError(null);
    }
  }, [isOpen, defaultPayerId, defaultPayeeId, defaultAmountMinor, members]);

  if (!isOpen) return null;

  const currencySymbol = getCurrencySymbol(currency);
  const minorAmount = Math.round(parseFloat(amountInput || '0') * 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (payerMemberId === payeeMemberId) {
      setError('Payer and payee cannot be the same member');
      return;
    }

    if (isNaN(minorAmount) || minorAmount <= 0) {
      setError('Amount must be greater than zero');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/groups/${groupId}/settlements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payerMemberId,
          payeeMemberId,
          amount: minorAmount,
          currency,
          paymentMethod: paymentMethod.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to record settlement');
      }

      toast.success('Settlement recorded! Debts updated.');
      onSettled();
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
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-sm shadow-emerald-500/10 dark:bg-emerald-950 dark:text-emerald-400">
              <Handshake className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Settle Up
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Record a debt settlement between two members.
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

          <form id="settle-up-form" onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                  Payer (Who paid)
                </label>
                <select
                  value={payerMemberId}
                  onChange={(e) => setPayerMemberId(e.target.value)}
                  className="block w-full min-h-[44px] rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-base sm:text-sm text-zinc-900 shadow-xs focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white transition-all cursor-pointer"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.displayName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                  Payee (Who received)
                </label>
                <select
                  value={payeeMemberId}
                  onChange={(e) => setPayeeMemberId(e.target.value)}
                  className="block w-full min-h-[44px] rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-base sm:text-sm text-zinc-900 shadow-xs focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white transition-all cursor-pointer"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.displayName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                Amount ({currencySymbol}) *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm font-bold text-zinc-400">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="0.00"
                  className="block w-full min-h-[44px] rounded-xl border border-zinc-300 bg-white pl-8 pr-3.5 py-2.5 text-base sm:text-sm text-zinc-900 shadow-xs focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white font-mono font-bold transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                Payment Method
              </label>
              <input
                type="text"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                placeholder="e.g. UPI (GPay/PhonePe), Cash, NetBanking"
                className="block w-full min-h-[44px] rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-base sm:text-sm text-zinc-900 shadow-xs focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Cleared bill portion"
                className="block w-full min-h-[44px] rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-base sm:text-sm text-zinc-900 shadow-xs focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white transition-all"
              />
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
            form="settle-up-form"
            type="submit"
            disabled={loading}
            className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-500 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 disabled:opacity-50 active:scale-[0.98] transition-all cursor-pointer ${
              loading ? 'animate-shadow-pulse-emerald pointer-events-none' : ''
            }`}
          >
            {loading ? (
              <>
                <ShadowPulseDot />
                <span>Recording Settlement...</span>
              </>
            ) : (
              <>
                <Handshake className="h-4 w-4" />
                <span>Record Settlement</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
