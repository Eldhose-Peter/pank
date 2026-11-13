'use client';

import { useState, useId } from 'react';
import { 
  X, 
  Plus, 
  Receipt, 
  AlertCircle, 
  Users, 
  Calculator,
  Check,
  ChevronDown
} from 'lucide-react';
import { formatMinorUnits, getCurrencySymbol } from '@/lib/utils';
import { calculateSplits } from '@/modules/accounting/calculations';
import type { SplitType } from '@/modules/accounting/types';
import { useToast } from '@/components/ui/Toast';
import { ShadowPulseDot } from '@/components/ui/ShadowLoader';

interface GroupMember {
  id: string;
  displayName: string;
  userId?: string | null;
  role: string;
}

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  members: GroupMember[];
  currency: string;
  currentMemberId?: string;
  onExpenseAdded: () => void;
}

export function AddExpenseModal({
  isOpen,
  onClose,
  groupId,
  members,
  currency,
  currentMemberId,
  onExpenseAdded,
}: AddExpenseModalProps) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [paidByMemberId, setPaidByMemberId] = useState(currentMemberId || members[0]?.id || '');
  
  // Selected participants for split
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(() => members.map((m) => m.id));
  
  // Custom split values (keyed by memberId): percentages, exact amounts, or shares
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Convert input string to minor units integer (paise/cents)
  const minorAmount = Math.round(parseFloat(amountInput || '0') * 100);

  // Compute live preview splits using domain accounting calculations
  let calculatedSplitsPreview: { memberId: string; owedAmount: number }[] = [];
  let splitValidationError: string | null = null;

  if (minorAmount > 0 && selectedMemberIds.length > 0) {
    try {
      const participantInputs = selectedMemberIds.map((id) => {
        const val = parseFloat(customValues[id] || '0');
        return {
          memberId: id,
          splitValue: splitType === 'equal' ? 1 : val,
        };
      });

      calculatedSplitsPreview = calculateSplits(
        splitType,
        minorAmount,
        participantInputs
      );
    } catch (err: any) {
      splitValidationError = err.message;
    }
  }

  // Allocation metrics for UI feedback on exact & percentage splits
  const allocatedExactMinor = splitType === 'exact'
    ? selectedMemberIds.reduce((sum, id) => sum + Math.round(parseFloat(customValues[id] || '0') * 100), 0)
    : 0;
  const remainingExactMinor = minorAmount - allocatedExactMinor;

  const totalPercentage = splitType === 'percentage'
    ? selectedMemberIds.reduce((sum, id) => sum + parseFloat(customValues[id] || '0'), 0)
    : 0;
  const remainingPercentage = 100 - totalPercentage;

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMemberIds((prev) => {
      if (prev.includes(memberId)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((id) => id !== memberId);
      } else {
        return [...prev, memberId];
      }
    });
  };

  const handleCustomValueChange = (memberId: string, value: string) => {
    setCustomValues((prev) => ({
      ...prev,
      [memberId]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (isNaN(minorAmount) || minorAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    if (selectedMemberIds.length === 0) {
      setError('Please select at least one person to split with');
      return;
    }

    if (splitValidationError) {
      setError(splitValidationError);
      return;
    }

    setLoading(true);

    try {
      // Prepare payload conforming to createExpenseSchema
      const participants = selectedMemberIds.map((id) => {
        const val = parseFloat(customValues[id] || '0');
        let splitValue: number | undefined = undefined;
        if (splitType === 'exact') {
          splitValue = Math.round(val * 100); // minor units
        } else if (splitType === 'percentage' || splitType === 'shares') {
          splitValue = val;
        }

        return {
          groupMemberId: id,
          ...(splitValue !== undefined ? { splitValue } : {}),
        };
      });

      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        amount: minorAmount,
        currency,
        splitType,
        expenseDate: date,
        paidByMemberId,
        participants,
      };

      const res = await fetch(`/api/groups/${groupId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save expense');
      }

      toast.success(`Expense "${title.trim()}" added! Balances updated.`);
      onExpenseAdded();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const currencySymbol = getCurrencySymbol(currency);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md overflow-y-auto">
      <div className="my-8 w-full max-w-lg rounded-3xl border border-zinc-200/90 bg-white p-6 sm:p-8 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm shadow-indigo-500/10 dark:bg-indigo-950 dark:text-indigo-400">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
                Add Expense
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Log a shared bill and split with precision.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Description / Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Dinner, Groceries, Hotel booking"
              className="mt-1 block w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Amount ({currencySymbol}) *
              </label>
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm font-semibold text-zinc-400">
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
                  className="block w-full rounded-xl border border-zinc-300 bg-white pl-8 pr-3.5 py-2.5 text-sm text-zinc-900 shadow-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>
          </div>

          {/* Paid By */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Paid by
            </label>
            <select
              value={paidByMemberId}
              onChange={(e) => setPaidByMemberId(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName} {m.id === currentMemberId ? '(You)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Split Type Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Split Type
            </label>
            <div className="mt-1 grid grid-cols-4 gap-2">
              {(['equal', 'exact', 'percentage', 'shares'] as SplitType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSplitType(type)}
                  className={`rounded-xl py-2 text-xs font-semibold capitalize border transition-all ${
                    splitType === type
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:border-indigo-500 dark:text-indigo-300'
                      : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Participants & Values */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Split with ({selectedMemberIds.length} selected)
              </label>
              <button
                type="button"
                onClick={() => setSelectedMemberIds(members.map((m) => m.id))}
                className="text-xs text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 font-medium"
              >
                Select all
              </button>
            </div>

            <div className="mt-2 space-y-2 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
              {members.map((m) => {
                const isSelected = selectedMemberIds.includes(m.id);
                const preview = calculatedSplitsPreview.find((s) => s.memberId === m.id);

                return (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between rounded-lg p-2 transition-colors ${
                      isSelected ? 'bg-zinc-50 dark:bg-zinc-800/60' : 'opacity-60'
                    }`}
                  >
                    <label className="flex items-center gap-2.5 cursor-pointer text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleMemberSelection(m.id)}
                        className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-600 dark:border-zinc-700 dark:bg-zinc-800"
                      />
                      <span>{m.displayName} {m.id === currentMemberId ? '(You)' : ''}</span>
                    </label>

                    {isSelected && (
                      <div className="flex items-center gap-2">
                        {splitType === 'exact' && (
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-xs text-zinc-400">
                              {currencySymbol}
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={customValues[m.id] || ''}
                              onChange={(e) => handleCustomValueChange(m.id, e.target.value)}
                              placeholder="0.00"
                              className="w-24 rounded-lg border border-zinc-300 bg-white pl-6 pr-2 py-1 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white font-mono"
                            />
                          </div>
                        )}

                        {splitType === 'percentage' && (
                          <div className="relative">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              value={customValues[m.id] || ''}
                              onChange={(e) => handleCustomValueChange(m.id, e.target.value)}
                              placeholder="0"
                              className="w-20 rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white font-mono"
                            />
                            <span className="text-xs text-zinc-500 ml-1">%</span>
                          </div>
                        )}

                        {splitType === 'shares' && (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="1"
                              min="1"
                              value={customValues[m.id] || '1'}
                              onChange={(e) => handleCustomValueChange(m.id, e.target.value)}
                              placeholder="1"
                              className="w-16 rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white font-mono text-center"
                            />
                            <span className="text-xs text-zinc-500">share</span>
                          </div>
                        )}

                        {preview && (
                          <span className="text-xs font-mono font-medium text-zinc-600 dark:text-zinc-300">
                            {formatMinorUnits(preview.owedAmount, currency)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Live split feedback for exact split */}
            {splitType === 'exact' && minorAmount > 0 && (
              <div className={`mt-3 flex items-center justify-between rounded-xl px-3.5 py-2 text-xs border ${
                remainingExactMinor === 0
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50'
                  : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50'
              }`}>
                <div className="flex items-center gap-1.5 font-medium">
                  {remainingExactMinor === 0 ? <Check className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-amber-600" />}
                  <span>
                    Allocated: <strong>{formatMinorUnits(allocatedExactMinor, currency)}</strong> of <strong>{formatMinorUnits(minorAmount, currency)}</strong>
                  </span>
                </div>
                <span className="font-semibold font-mono">
                  {remainingExactMinor === 0
                    ? '100% Allocated'
                    : remainingExactMinor > 0
                    ? `${formatMinorUnits(remainingExactMinor, currency)} remaining`
                    : `${formatMinorUnits(Math.abs(remainingExactMinor), currency)} over`}
                </span>
              </div>
            )}

            {/* Live split feedback for percentage split */}
            {splitType === 'percentage' && (
              <div className={`mt-3 flex items-center justify-between rounded-xl px-3.5 py-2 text-xs border ${
                Math.abs(remainingPercentage) < 0.01
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50'
                  : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50'
              }`}>
                <div className="flex items-center gap-1.5 font-medium">
                  {Math.abs(remainingPercentage) < 0.01 ? <Check className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-amber-600" />}
                  <span>
                    Total: <strong>{totalPercentage.toFixed(1)}%</strong>
                  </span>
                </div>
                <span className="font-semibold font-mono">
                  {Math.abs(remainingPercentage) < 0.01
                    ? 'Exact 100%'
                    : remainingPercentage > 0
                    ? `${remainingPercentage.toFixed(1)}% remaining`
                    : `${Math.abs(remainingPercentage).toFixed(1)}% over`}
                </span>
              </div>
            )}

            {/* Split validation error banner */}
            {splitValidationError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900/50">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <p className="font-medium">{splitValidationError}</p>
              </div>
            )}
          </div>

          <div className="mt-8 flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || Boolean(splitValidationError)}
              title={splitValidationError || 'Save Expense'}
              className={`flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-500 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 disabled:opacity-50 active:scale-[0.98] transition-all cursor-pointer ${
                loading ? 'animate-shadow-pulse pointer-events-none' : ''
              }`}
            >
              {loading ? (
                <>
                  <ShadowPulseDot />
                  <span>Saving Expense...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Add Expense</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
