'use client';

import { useState } from 'react';
import { 
  Sparkles, 
  X, 
  AlertCircle, 
  Check, 
  HelpCircle, 
  ArrowRight, 
  Loader2, 
  Receipt,
  User,
  PlusCircle,
  Trash2,
  Edit2
} from 'lucide-react';
import { formatMinorUnits, getCurrencySymbol } from '@/lib/utils';
import type { ExpenseDraftPreview, ClarificationQuestion } from '@/modules/ai/types';

interface GroupMember {
  id: string;
  displayName: string;
  userId?: string | null;
  role: string;
}

interface AiExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupCurrency: string;
  members: GroupMember[];
  onExpenseAdded: () => void;
}

export function AiExpenseModal({
  isOpen,
  onClose,
  groupId,
  groupCurrency,
  members,
  onExpenseAdded,
}: AiExpenseModalProps) {
  const [promptText, setPromptText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active draft state
  const [draft, setDraft] = useState<ExpenseDraftPreview | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Clarification responses: questionId -> selected value
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<string, string>>({});

  // Editable fields in preview
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');

  if (!isOpen) return null;

  const quickPrompts = [
    `I paid ${getCurrencySymbol(groupCurrency)}2,400 for dinner. Split it equally between everyone`,
    `I spent ${getCurrencySymbol(groupCurrency)}450 for cab, split with ${members[1]?.displayName || 'a friend'}`,
    `Groceries ${getCurrencySymbol(groupCurrency)}1,800 paid by me, split with ${members.slice(0, 3).map((m) => m.displayName).join(', ')}`,
  ];

  const handleParse = async (textToParse?: string) => {
    const text = (textToParse || promptText).trim();
    if (!text) return;

    setParsing(true);
    setError(null);
    setDraft(null);

    try {
      const res = await fetch(`/api/groups/${groupId}/ai/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to parse expense');
      }

      setDraft(data.draft);
      setEditTitle(data.draft.title);
      setEditAmount((data.draft.amount / 100).toString());
      setClarificationAnswers({});
    } catch (err: any) {
      setError(err.message || 'Error communicating with AI service');
    } finally {
      setParsing(false);
    }
  };

  const handleClarificationChange = (questionId: string, val: string) => {
    setClarificationAnswers((prev) => ({
      ...prev,
      [questionId]: val,
    }));
  };

  const handleApplyClarifications = async () => {
    if (!draft) return;
    setUpdating(true);
    setError(null);

    try {
      // Collect resolved member choices
      const resolvedParticipantIds = [...draft.splits.map((s) => s.groupMemberId)];
      
      for (const [qId, val] of Object.entries(clarificationAnswers)) {
        if (val.startsWith('create_placeholder:')) {
          const rawName = val.replace('create_placeholder:', '');
          // Create placeholder member
          const memberRes = await fetch(`/api/groups/${groupId}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ displayName: rawName, isPlaceholder: true }),
          });
          const memberData = await memberRes.json();
          if (memberRes.ok && memberData.member) {
            resolvedParticipantIds.push(memberData.member.id);
          }
        } else if (val) {
          resolvedParticipantIds.push(val);
        }
      }

      // Update the draft
      const updateRes = await fetch(`/api/groups/${groupId}/ai/drafts/${draft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participants: Array.from(new Set(resolvedParticipantIds)).map((id) => ({
            groupMemberId: id,
          })),
        }),
      });

      const updateData = await updateRes.json();
      if (!updateRes.ok) {
        throw new Error(updateData.error || 'Failed to update draft');
      }

      setDraft(updateData.draft);
      setClarificationAnswers({});
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!draft) return;
    setUpdating(true);
    setError(null);

    try {
      const parsedAmount = Math.round(parseFloat(editAmount || '0') * 100);
      if (parsedAmount <= 0) {
        throw new Error('Amount must be greater than zero');
      }

      const res = await fetch(`/api/groups/${groupId}/ai/drafts/${draft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim() || draft.title,
          amount: parsedAmount,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update draft');
      }

      setDraft(data.draft);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirmDraft = async () => {
    if (!draft) return;
    setConfirming(true);
    setError(null);

    try {
      const res = await fetch(`/api/groups/${groupId}/ai/drafts/${draft.id}/confirm`, {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to confirm expense');
      }

      onExpenseAdded();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConfirming(false);
    }
  };

  const handleDiscard = async () => {
    if (draft) {
      fetch(`/api/groups/${groupId}/ai/drafts/${draft.id}/reject`, { method: 'POST' }).catch(() => {});
    }
    setDraft(null);
    setPromptText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-6 py-4 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                Fast Natural Language Expense
                <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold px-2 py-0.5 border border-indigo-200 dark:border-indigo-800">
                  Gemini 2.5 Flash
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Type what you paid and with whom in plain English
              </p>
            </div>
          </div>
          <button
            onClick={handleDiscard}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl bg-red-50 p-3.5 text-xs text-red-600 dark:bg-red-950/50 dark:text-red-400 border border-red-200 dark:border-red-900/50">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {/* Prompt Input Section */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Expense Description
            </label>
            <div className="relative">
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                rows={3}
                placeholder="e.g. I paid ₹2,400 for dinner. Split it equally between me, Rahul, Priya and Arjun."
                className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white resize-none"
                disabled={parsing}
              />
              <button
                type="button"
                onClick={() => handleParse()}
                disabled={parsing || !promptText.trim()}
                className="absolute right-2.5 bottom-2.5 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 disabled:pointer-events-none transition-all"
              >
                {parsing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Extract Draft
                  </>
                )}
              </button>
            </div>

            {/* Quick Prompt Pills */}
            {!draft && (
              <div className="mt-2.5 space-y-1.5">
                <span className="text-[11px] font-medium text-zinc-400">Try an example:</span>
                <div className="flex flex-wrap gap-1.5">
                  {quickPrompts.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setPromptText(p);
                        handleParse(p);
                      }}
                      className="rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] px-2.5 py-1 text-left transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* DRAFT PREVIEW OR CLARIFICATION */}
          {draft && (
            <div className="rounded-xl border border-indigo-100 dark:border-indigo-950 bg-indigo-50/30 dark:bg-indigo-950/20 p-4 space-y-4">
              {/* Status Header */}
              <div className="flex items-center justify-between border-b border-indigo-100 dark:border-indigo-900/40 pb-3">
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${
                    draft.status === 'ready_for_review' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`} />
                  <span className="text-xs font-semibold text-zinc-900 dark:text-white uppercase tracking-wider">
                    {draft.status === 'ready_for_review' ? 'Draft Ready for Review' : 'Clarification Required'}
                  </span>
                </div>
                <div className="text-xs text-zinc-500">
                  Split Type: <span className="font-semibold text-zinc-700 dark:text-zinc-300 capitalize">{draft.splitType}</span>
                </div>
              </div>

              {/* Clarification Questions (if any) */}
              {draft.clarificationQuestions && draft.clarificationQuestions.length > 0 && (
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-3.5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                    <HelpCircle className="h-4 w-4" />
                    Please clarify the following:
                  </div>
                  {draft.clarificationQuestions.map((q) => (
                    <div key={q.id} className="space-y-1.5 text-xs">
                      <p className="font-medium text-amber-900 dark:text-amber-200">{q.question}</p>
                      {q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                          {q.options.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => handleClarificationChange(q.id, opt.value)}
                              className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium border text-left transition-all ${
                                clarificationAnswers[q.id] === opt.value
                                  ? 'bg-amber-600 text-white border-amber-600'
                                  : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-amber-400'
                              }`}
                            >
                              <span>{opt.label}</span>
                              {clarificationAnswers[q.id] === opt.value && <Check className="h-3.5 w-3.5 ml-1" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleApplyClarifications}
                    disabled={updating || Object.keys(clarificationAnswers).length === 0}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-amber-500 disabled:opacity-50"
                  >
                    {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Apply Clarifications
                  </button>
                </div>
              )}

              {/* Draft Content Card */}
              <div className="bg-white dark:bg-zinc-950 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 space-y-3">
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-zinc-500">Title</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 px-2.5 py-1.5 dark:bg-zinc-900"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-zinc-500">Amount ({groupCurrency})</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 px-2.5 py-1.5 dark:bg-zinc-900"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="text-xs px-2.5 py-1 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        disabled={updating}
                        className="text-xs px-3 py-1 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{draft.title}</h4>
                        <button
                          type="button"
                          onClick={() => setIsEditing(true)}
                          className="text-zinc-400 hover:text-indigo-600 p-0.5"
                          title="Edit title & amount"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-zinc-500">
                        Paid by <span className="font-semibold text-zinc-700 dark:text-zinc-300">{draft.payers[0]?.displayName || 'You'}</span> on {draft.expenseDate}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-extrabold text-zinc-900 dark:text-white">
                        {formatMinorUnits(draft.amount, draft.currency)}
                      </div>
                      <div className="text-[11px] text-zinc-400 capitalize">{draft.splitType} split</div>
                    </div>
                  </div>
                )}

                {/* Individual Shares Breakdown */}
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                  <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Individual Shares ({draft.splits.length} participants)</span>
                    <span>Exact Share</span>
                  </div>

                  <div className="divide-y divide-zinc-100 dark:divide-zinc-900 text-xs">
                    {draft.splits.map((s) => (
                      <div key={s.groupMemberId} className="py-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-zinc-400" />
                          <span className="font-medium text-zinc-800 dark:text-zinc-200">{s.displayName}</span>
                        </div>
                        <span className="font-semibold text-zinc-900 dark:text-white">
                          {formatMinorUnits(s.owedAmount, draft.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleDiscard}
                  className="rounded-xl px-3.5 py-2 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Discard
                </button>

                <button
                  type="button"
                  onClick={handleConfirmDraft}
                  disabled={confirming || draft.status !== 'ready_for_review'}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:pointer-events-none transition-all"
                >
                  {confirming ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving to Database...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Confirm & Save Expense
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
