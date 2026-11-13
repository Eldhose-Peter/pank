'use client';

import { useState, useCallback, useRef } from 'react';
import { 
  Sparkles, 
  X, 
  AlertCircle, 
  Check, 
  HelpCircle, 
  Loader2, 
  Receipt, 
  Trash2, 
  Edit2, 
  Mic, 
  MicOff, 
  Zap, 
  Camera, 
  FileText, 
  ExternalLink, 
  UploadCloud, 
  CheckCircle2, 
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatMinorUnits, getCurrencySymbol } from '@/lib/utils';
import type { ExpenseDraftPreview, ClarificationQuestion } from '@/modules/ai/types';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

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

  // Tab state: 'receipt' for 2-step bill splitting, 'text' for natural language
  type InputTab = 'receipt' | 'text';
  const [inputTab, setInputTab] = useState<InputTab>('receipt');
  const [isDragging, setIsDragging] = useState(false);

  // Bill / receipt upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [billParsing, setBillParsing] = useState(false);
  const [showReceiptItems, setShowReceiptItems] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Step 2 refinement instructions state
  const [refineText, setRefineText] = useState('');
  const [refining, setRefining] = useState(false);

  const handleBillUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setError('File is too large. Maximum size is 15MB.');
      return;
    }

    setSelectedFile(file);
    setInputTab('receipt');
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
    } else {
      setFilePreviewUrl(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Voice input state
  type VoiceMode = 'browser' | 'gemini';
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('browser');
  const [voiceParsing, setVoiceParsing] = useState(false);

  // Helper to sanitize cryptic browser media errors into actionable messages
  const sanitizeErrorMessage = (msg: string): string => {
    if (
      msg.includes('navigator.mediaDevices.getUserMedia') ||
      msg.includes('undefined is not an object') ||
      msg.includes('getUserMedia')
    ) {
      return 'Microphone access is blocked by your browser on insecure HTTP (LAN/IP address). Please access the app using "http://localhost:3000" or enable HTTPS.';
    }
    return msg;
  };

  // Phase 1: Web Speech API (browser-native, free)
  const {
    isListening,
    isSupported: webSpeechSupported,
    toggleListening: toggleWebSpeech,
  } = useVoiceInput({
    lang: 'en-IN',
    onResult: (text) => {
      if (draft) {
        setRefineText((prev) => (prev ? `${prev} ${text}` : text));
      } else {
        setPromptText((prev) => (prev ? `${prev} ${text}` : text));
      }
    },
    onError: (err) => setError(sanitizeErrorMessage(err)),
  });

  // Phase 2: Gemini multimodal audio (records blob, sends to backend)
  const {
    isRecording,
    startRecording,
    stopRecording,
  } = useAudioRecorder({
    onError: (err) => setError(sanitizeErrorMessage(err)),
  });

  const handleGeminiVoiceStop = useCallback(async () => {
    const audioBlob = await stopRecording();
    if (!audioBlob || audioBlob.size === 0) {
      setError('No audio recorded. Please try again.');
      return;
    }

    setVoiceParsing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice-expense.webm');
      if (draft) {
        formData.append('draftId', draft.id);
      }

      const res = await fetch(`/api/groups/${groupId}/ai/voice-parse`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to parse voice input');
      }

      if (draft) {
        setDraft(data.draft);
        setEditTitle(data.draft.title);
        setEditAmount((data.draft.amount / 100).toString());
        setClarificationAnswers({});
        setRefineText('');
      } else {
        if (data.transcript) {
          setPromptText(data.transcript);
        }
        setDraft(data.draft);
        setEditTitle(data.draft.title);
        setEditAmount((data.draft.amount / 100).toString());
        setClarificationAnswers({});
      }
    } catch (err: any) {
      setError(sanitizeErrorMessage(err.message || 'Error processing voice input'));
    } finally {
      setVoiceParsing(false);
    }
  }, [stopRecording, groupId, draft]);

  const handleMicToggle = useCallback(async () => {
    setError(null);

    // Guard against insecure HTTP context (e.g. LAN access http://192.168.x.x:3000 or http://*.local)
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      setError(
        'Microphone access is blocked by your browser on insecure HTTP (LAN/IP address). Please access the app using "http://localhost:3000" or enable HTTPS.'
      );
      return;
    }

    if (voiceMode === 'browser') {
      if (!webSpeechSupported) {
        setError('Browser speech is not supported in this browser. Switching to Gemini AI mode...');
        setVoiceMode('gemini');
        try {
          await startRecording();
        } catch (err: any) {
          setError(sanitizeErrorMessage(err.message || 'Microphone access failed'));
        }
        return;
      }
      toggleWebSpeech();
    } else {
      if (isRecording) {
        await handleGeminiVoiceStop();
      } else {
        try {
          await startRecording();
        } catch (err: any) {
          setError(sanitizeErrorMessage(err.message || 'Microphone access failed'));
        }
      }
    }
  }, [voiceMode, webSpeechSupported, toggleWebSpeech, isRecording, handleGeminiVoiceStop, startRecording]);

  const isVoiceActive = voiceMode === 'browser' ? isListening : isRecording;

  if (!isOpen) return null;

  const quickPrompts = [
    `I paid ${getCurrencySymbol(groupCurrency)}2,400 for dinner. Split it equally between everyone`,
    `I spent ${getCurrencySymbol(groupCurrency)}450 for cab, split with ${members[1]?.displayName || 'a friend'}`,
    `Groceries ${getCurrencySymbol(groupCurrency)}1,800 paid by me, split with ${members.slice(0, 3).map((m) => m.displayName).join(', ')}`,
  ];

  const handleParse = async (textToParse?: string) => {
    // If a bill/receipt is selected, use the bill-parse endpoint (Step 1: parse image first)
    if (selectedFile) {
      setError(null);
      setBillParsing(true);
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const res = await fetch(`/api/groups/${groupId}/ai/bill-parse`, {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to scan bill');
        }

        setDraft(data.draft);
        setEditTitle(data.draft.title);
        setEditAmount((data.draft.amount / 100).toString());
        setClarificationAnswers({});
        setShowReceiptItems(true);
      } catch (err: any) {
        setError(err.message || 'Error scanning bill');
      } finally {
        setBillParsing(false);
      }
      return;
    }

    const text = (textToParse || promptText).trim();
    if (!text) return;

    setError(null);
    setParsing(true);

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

  const handleRefineDraft = async (customInstructions?: string) => {
    const instructions = (customInstructions || refineText).trim();
    if (!instructions || !draft) return;

    setRefining(true);
    setError(null);

    try {
      const res = await fetch(`/api/groups/${groupId}/ai/drafts/${draft.id}/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructions }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to refine split');
      }

      setDraft(data.draft);
      setEditTitle(data.draft.title);
      setEditAmount((data.draft.amount / 100).toString());
      setClarificationAnswers({});
      setRefineText('');
    } catch (err: any) {
      setError(err.message || 'Error updating split with instructions');
    } finally {
      setRefining(false);
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
      const resolvedParticipantIds = [...draft.splits.map((s) => s.groupMemberId)];
      
      for (const [qId, val] of Object.entries(clarificationAnswers)) {
        if (val.startsWith('create_placeholder:')) {
          const rawName = val.replace('create_placeholder:', '');
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
    setRefineText('');
    handleRemoveFile();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 px-6 py-4 bg-zinc-50/70 dark:bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                  AI Expense Splitter
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold px-2 py-0.5 border border-indigo-200 dark:border-indigo-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Gemini Flash
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Scan receipts or speak in plain English to split automatically
              </p>
            </div>
          </div>

          <button
            onClick={handleDiscard}
            className="rounded-xl p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="flex items-start justify-between gap-2.5 rounded-xl bg-red-50 p-3.5 text-xs text-red-600 dark:bg-red-950/50 dark:text-red-400 border border-red-200 dark:border-red-900/50 animate-in fade-in">
              <div className="flex items-start gap-2.5 flex-1">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                <div className="space-y-1 leading-relaxed">
                  <div className="font-medium">{error}</div>
                  {error.includes('insecure HTTP') && (
                    <div className="text-[11px] text-zinc-600 dark:text-zinc-400 pt-0.5">
                      💡 <strong>Tip:</strong> If accessing from a phone or other device on your Wi-Fi, run Next.js with HTTPS: <code className="bg-red-100/70 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono text-[10px]">npm run dev -- --experimental-https</code>, or access directly via <code className="bg-red-100/70 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono text-[10px]">http://localhost:3000</code>.
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600 dark:hover:text-red-200 p-0.5 cursor-pointer shrink-0"
                title="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Mode Selection and Inputs (shown when no draft) */}
          {!draft && (
            <div className="space-y-4">
              {/* Segmented Tab Switcher */}
              <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60">
                <button
                  type="button"
                  onClick={() => setInputTab('receipt')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    inputTab === 'receipt'
                      ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  <Receipt className="h-4 w-4" />
                  <span>Scan Receipt / Bill</span>
                  {selectedFile && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
                </button>

                <button
                  type="button"
                  onClick={() => setInputTab('text')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    inputTab === 'text'
                      ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Type or Speak Expense</span>
                </button>
              </div>

              {/* File Upload Hidden Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleBillUpload}
              />

              {/* TAB 1: SCAN BILL / RECEIPT (STEP 1) */}
              {inputTab === 'receipt' && (
                <div className="space-y-3.5">
                  <div className="flex items-center gap-2.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/50 px-3.5 py-2.5 text-xs text-indigo-900 dark:text-indigo-200">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white shrink-0">
                      1
                    </span>
                    <span className="leading-snug">
                      <strong className="font-semibold text-indigo-950 dark:text-indigo-100">Step 1: Scan Bill.</strong> Upload receipt to extract itemized line items. In Step 2, you can verify items and add custom split instructions.
                    </span>
                  </div>

                  {!selectedFile ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) {
                          const syntheticEvent = { target: { files: [file] } } as any;
                          handleBillUpload(syntheticEvent);
                        }
                      }}
                      className={`border-2 border-dashed rounded-2xl py-10 px-6 text-center cursor-pointer transition-all ${
                        isDragging
                          ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/50 ring-4 ring-indigo-500/10'
                          : 'border-zinc-300 dark:border-zinc-700/80 hover:border-indigo-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                      }`}
                    >
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-3.5 shadow-sm">
                        <Camera className="h-7 w-7" />
                      </div>
                      <p className="text-sm font-bold text-zinc-900 dark:text-white">
                        Upload or snap a receipt / bill photo
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">
                        JPEG, PNG, WebP or PDF · up to 15MB
                      </p>
                      <div className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors pointer-events-none">
                        <UploadCloud className="h-4 w-4" />
                        <span>Select Receipt File</span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {filePreviewUrl ? (
                            <img
                              src={filePreviewUrl}
                              alt="Receipt preview"
                              className="h-14 w-14 rounded-xl object-cover border border-indigo-200 dark:border-indigo-800 shadow-sm"
                            />
                          ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600">
                              <FileText className="h-7 w-7" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-bold text-zinc-900 dark:text-white truncate max-w-[280px]">
                              {selectedFile.name}
                            </p>
                            <p className="text-xs text-zinc-500 mt-0.5">
                              {(selectedFile.size / 1024).toFixed(0)} KB · Ready to scan with Gemini Vision OCR
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="rounded-xl p-2 text-zinc-400 hover:text-red-500 hover:bg-white dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                          title="Remove file"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-indigo-100 dark:border-indigo-900/40">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
                        >
                          Change receipt file
                        </button>

                        <button
                          type="button"
                          onClick={() => handleParse()}
                          disabled={billParsing}
                          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 transition-all cursor-pointer"
                        >
                          {billParsing ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Scanning & Itemizing...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4" />
                              <span>Scan Bill</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {billParsing && (
                    <div className="flex items-center gap-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 p-3.5 text-xs text-indigo-700 dark:text-indigo-300 animate-in fade-in">
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-600 shrink-0" />
                      <div>
                        <p className="font-semibold">Extracting merchant, line items, and total with Gemini Vision...</p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          Step 2 will display the verified items and let you provide custom split instructions.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: TEXT & VOICE PROMPT */}
              {inputTab === 'text' && (
                <div className="space-y-3.5">
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                    <textarea
                      value={promptText}
                      onChange={(e) => setPromptText(e.target.value)}
                      rows={3}
                      placeholder={
                        isVoiceActive
                          ? voiceMode === 'browser'
                            ? '🎤 Listening via Browser Speech... speak your expense now'
                            : '🎤 Recording for Gemini AI... tap "Stop Rec" when done'
                          : 'e.g. I paid ₹2,400 for dinner. Split it equally between me, Rahul, Priya and Arjun.'
                      }
                      className="w-full bg-transparent p-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-white resize-none"
                      disabled={parsing || voiceParsing}
                    />

                    {/* Bottom Action Bar */}
                    <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/70 px-3 py-2">
                      <div className="flex items-center gap-2">
                        {/* Voice Mic Button */}
                        <button
                          type="button"
                          onClick={handleMicToggle}
                          disabled={parsing || voiceParsing}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer ${
                            isVoiceActive
                              ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-500/30'
                              : voiceParsing
                              ? 'bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-300 border border-violet-300 dark:border-violet-800'
                              : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700'
                          }`}
                        >
                          {isVoiceActive ? (
                            <>
                              <MicOff className="h-3.5 w-3.5" />
                              <span>{voiceMode === 'browser' ? 'Listening...' : 'Stop Rec'}</span>
                            </>
                          ) : (
                            <>
                              <Mic className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                              <span>Speak</span>
                            </>
                          )}
                        </button>

                        {/* Voice Engine Toggle */}
                        <div className="inline-flex items-center rounded-lg bg-zinc-200/70 dark:bg-zinc-800 p-0.5 text-[10px] font-medium">
                          <button
                            type="button"
                            onClick={() => {
                              if (isVoiceActive) return;
                              setVoiceMode('browser');
                            }}
                            disabled={isVoiceActive}
                            className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                              voiceMode === 'browser'
                                ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                            }`}
                          >
                            Browser
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (isVoiceActive) return;
                              setVoiceMode('gemini');
                            }}
                            disabled={isVoiceActive}
                            className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                              voiceMode === 'gemini'
                                ? 'bg-white dark:bg-zinc-700 text-violet-600 dark:text-violet-400 shadow-xs font-bold'
                                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                            }`}
                          >
                            Gemini AI
                          </button>
                        </div>
                      </div>

                      {/* Extract Draft Button */}
                      <button
                        type="button"
                        onClick={() => handleParse()}
                        disabled={parsing || voiceParsing || !promptText.trim()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-40 transition-all cursor-pointer"
                      >
                        {parsing ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Parsing...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Extract Draft</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Voice Activity Feedback Bar */}
                  {isVoiceActive && (
                    <div className="flex items-center justify-between rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 px-3.5 py-2 text-xs text-red-600 dark:text-red-400 animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                        </span>
                        <span className="font-medium">
                          {voiceMode === 'browser'
                            ? 'Listening via Browser Speech API... speak your expense'
                            : 'Recording audio for Gemini AI... tap "Stop Rec" when done'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleMicToggle}
                        className="font-bold underline hover:no-underline text-xs cursor-pointer"
                      >
                        {voiceMode === 'browser' ? 'Done' : 'Process Audio'}
                      </button>
                    </div>
                  )}

                  {voiceParsing && (
                    <div className="flex items-center gap-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-900/50 px-3.5 py-2 text-xs text-violet-600 dark:text-violet-400 animate-in fade-in">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span className="font-medium">
                        Uploading audio to Gemini multimodal AI for transcription & split calculation...
                      </span>
                    </div>
                  )}

                  {/* Quick Prompt Pills */}
                  <div className="space-y-1.5 pt-1">
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
                          className="rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] px-2.5 py-1 text-left transition-colors cursor-pointer"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DRAFT PREVIEW OR CLARIFICATION */}
          {draft && (
            <div className="rounded-2xl border border-indigo-100 dark:border-indigo-950/80 bg-indigo-50/20 dark:bg-indigo-950/20 p-4 sm:p-5 space-y-4">
              {/* 2-Step Progress Stepper for Scanned Receipts */}
              {(draft.receiptItems?.length || draft.receiptUrl) && (
                <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-emerald-50/90 via-indigo-50/80 to-violet-50/90 dark:from-emerald-950/50 dark:via-indigo-950/40 dark:to-violet-950/50 border border-indigo-200/70 dark:border-indigo-900/50 px-3.5 py-2.5 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>Step 1: Bill Items Extracted</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-violet-700 dark:text-violet-300 font-bold">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
                    </span>
                    <span>Step 2: Add Split Instructions (Optional)</span>
                  </div>
                </div>
              )}

              {/* Status Header */}
              <div className="flex items-center justify-between border-b border-indigo-100 dark:border-indigo-900/40 pb-3">
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${
                    draft.status === 'ready_for_review' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`} />
                  <span className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                    {draft.status === 'ready_for_review' ? 'Draft Ready for Review' : 'Clarification Required'}
                  </span>
                </div>
                <div className="text-xs text-zinc-500">
                  Split Type: <span className="font-semibold text-zinc-700 dark:text-zinc-300 capitalize">{draft.splitType}</span>
                </div>
              </div>

              {/* Clarification Questions (if any) */}
              {draft.clarificationQuestions && draft.clarificationQuestions.length > 0 && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                    <HelpCircle className="h-4 w-4" />
                    Please clarify the following:
                  </div>
                  {draft.clarificationQuestions.map((q) => (
                    <div key={q.id} className="space-y-2 text-xs">
                      <p className="font-medium text-amber-900 dark:text-amber-200">{q.question}</p>
                      {q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {q.options.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => handleClarificationChange(q.id, opt.value)}
                              className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium border text-left transition-all cursor-pointer ${
                                clarificationAnswers[q.id] === opt.value
                                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
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
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-500 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Apply Clarifications
                  </button>
                </div>
              )}

              {/* Draft Content Card */}
              <div className="bg-white dark:bg-zinc-950 rounded-2xl p-4 sm:p-5 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-zinc-500">Title</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 dark:bg-zinc-900 mt-1 focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-zinc-500">Amount ({groupCurrency})</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="w-full text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 dark:bg-zinc-900 mt-1 focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="text-xs px-3 py-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        disabled={updating}
                        className="text-xs px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-zinc-900 dark:text-white">{draft.title}</h4>
                        <button
                          type="button"
                          onClick={() => setIsEditing(true)}
                          className="text-zinc-400 hover:text-indigo-600 p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                          title="Edit title & amount"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-zinc-500">
                        Paid by <span className="font-semibold text-zinc-700 dark:text-zinc-300">{draft.payers[0]?.displayName || 'You'}</span> on {draft.expenseDate}
                      </p>
                      {draft.receiptUrl && (
                        <a
                          href={draft.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 mt-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                          <span>View Attached Bill</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-extrabold text-zinc-900 dark:text-white">
                        {formatMinorUnits(draft.amount, draft.currency)}
                      </div>
                      <div className="text-[11px] text-zinc-400 capitalize">{draft.splitType} split</div>
                    </div>
                  </div>
                )}

                {/* Scanned Bill Line Items Breakdown (if present) */}
                {draft.receiptItems && draft.receiptItems.length > 0 && (
                  <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowReceiptItems((prev) => !prev)}
                      className="flex items-center justify-between w-full text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-indigo-500" />
                        <span>Scanned Bill Items ({draft.receiptItems.length})</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                        {showReceiptItems ? (
                          <>
                            <span>Hide Items</span>
                            <ChevronUp className="h-3.5 w-3.5" />
                          </>
                        ) : (
                          <>
                            <span>Show Items</span>
                            <ChevronDown className="h-3.5 w-3.5" />
                          </>
                        )}
                      </span>
                    </button>

                    {showReceiptItems && (
                      <div className="space-y-1 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 p-2.5 text-xs divide-y divide-zinc-200/50 dark:divide-zinc-800/60 max-h-48 overflow-y-auto">
                        {draft.receiptItems.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center py-1.5 text-zinc-700 dark:text-zinc-300 first:pt-0.5 last:pb-0.5">
                            <span className="truncate pr-3 font-medium">{item.name}</span>
                            <span className="font-semibold text-zinc-900 dark:text-white shrink-0">
                              {getCurrencySymbol(draft.currency)}{item.amount.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 2: PROVIDE ADDITIONAL SPLIT INSTRUCTIONS */}
                <div className="rounded-xl border border-violet-200 dark:border-violet-900/60 bg-gradient-to-br from-violet-50/60 via-white to-indigo-50/40 dark:from-violet-950/30 dark:via-zinc-900/50 dark:to-indigo-950/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-violet-900 dark:text-violet-200">
                      <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                      <span>Step 2: Add Split Instructions (Optional)</span>
                    </div>

                    <div className="inline-flex items-center rounded-lg bg-white/80 dark:bg-zinc-800 p-0.5 text-[10px] font-medium border border-violet-200 dark:border-violet-800">
                      <button
                        type="button"
                        onClick={() => {
                          if (isVoiceActive) return;
                          setVoiceMode('browser');
                        }}
                        disabled={isVoiceActive}
                        className={`px-1.5 py-0.5 rounded cursor-pointer ${
                          voiceMode === 'browser'
                            ? 'bg-violet-600 text-white font-bold'
                            : 'text-zinc-500'
                        }`}
                      >
                        Browser
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (isVoiceActive) return;
                          setVoiceMode('gemini');
                        }}
                        disabled={isVoiceActive}
                        className={`px-1.5 py-0.5 rounded cursor-pointer ${
                          voiceMode === 'gemini'
                            ? 'bg-violet-600 text-white font-bold'
                            : 'text-zinc-500'
                        }`}
                      >
                        Gemini
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Verify the itemized list above. If anyone ordered specific items or ate a fraction, tell AI below:
                  </p>

                  {/* Input row with Mic and Update button */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleMicToggle}
                      disabled={refining || voiceParsing}
                      title={
                        isVoiceActive
                          ? 'Stop recording'
                          : `Speak using ${voiceMode === 'browser' ? 'Browser Speech' : 'Gemini Voice'}`
                      }
                      className={`h-10 w-10 flex items-center justify-center rounded-xl border transition-all shrink-0 cursor-pointer ${
                        isVoiceActive
                          ? 'bg-red-500 text-white animate-pulse border-red-500'
                          : 'border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40 bg-white dark:bg-zinc-900'
                      }`}
                    >
                      {isVoiceActive ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>

                    <input
                      type="text"
                      value={refineText}
                      onChange={(e) => setRefineText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && refineText.trim()) {
                          handleRefineDraft();
                        }
                      }}
                      placeholder="e.g. Alice had pizza, Bob had pasta, split drinks equally"
                      disabled={refining || voiceParsing}
                      className="flex-1 h-10 text-xs rounded-xl border border-violet-200 dark:border-violet-800 bg-white dark:bg-zinc-900 px-3.5 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
                    />

                    <button
                      type="button"
                      onClick={() => handleRefineDraft()}
                      disabled={refining || voiceParsing || !refineText.trim()}
                      className="h-10 inline-flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs px-4 shrink-0 shadow-sm disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      {refining ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Updating...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Update Split</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Suggestion Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleRefineDraft('Split equally between everyone')}
                      disabled={refining}
                      className="text-[10px] font-medium rounded-lg bg-white dark:bg-zinc-800 border border-violet-200 dark:border-violet-900 px-2.5 py-1 text-zinc-600 dark:text-zinc-300 hover:border-violet-400 transition-colors cursor-pointer shadow-2xs"
                    >
                      Split equally between everyone
                    </button>
                    {members.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRefineDraft(`Split 50-50 between ${members[0]?.displayName} and ${members[1]?.displayName}`)}
                        disabled={refining}
                        className="text-[10px] font-medium rounded-lg bg-white dark:bg-zinc-800 border border-violet-200 dark:border-violet-900 px-2.5 py-1 text-zinc-600 dark:text-zinc-300 hover:border-violet-400 transition-colors cursor-pointer shadow-2xs"
                      >
                        Split 50-50 between {members[0]?.displayName} & {members[1]?.displayName}
                      </button>
                    )}
                    {draft.receiptItems && draft.receiptItems.length > 0 && members.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRefineDraft(`${members[1]?.displayName} had ${draft.receiptItems![0].name}, split rest equally`)}
                        disabled={refining}
                        className="text-[10px] font-medium rounded-lg bg-white dark:bg-zinc-800 border border-violet-200 dark:border-violet-900 px-2.5 py-1 text-zinc-600 dark:text-zinc-300 hover:border-violet-400 transition-colors cursor-pointer shadow-2xs"
                      >
                        {members[1]?.displayName} had {draft.receiptItems[0].name}
                      </button>
                    )}
                  </div>
                </div>

                {/* Individual Shares Breakdown */}
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2.5">
                  <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Individual Shares ({draft.splits.length} participants)</span>
                    <span>Exact Share</span>
                  </div>

                  <div className="divide-y divide-zinc-100 dark:divide-zinc-900 text-xs">
                    {draft.splits.map((s) => {
                      const sharePercent = draft.amount > 0 ? Math.round((s.owedAmount / draft.amount) * 100) : 0;
                      return (
                        <div key={s.groupMemberId} className="py-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-[11px]">
                              {s.displayName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-semibold text-zinc-800 dark:text-zinc-200">{s.displayName}</span>
                              <span className="ml-2 text-[10px] text-zinc-400 font-normal">({sharePercent}%)</span>
                            </div>
                          </div>
                          <span className="font-bold text-zinc-900 dark:text-white">
                            {formatMinorUnits(s.owedAmount, draft.currency)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleDiscard}
                  className="rounded-xl px-4 py-2.5 text-xs font-semibold text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  Discard
                </button>

                <button
                  type="button"
                  onClick={handleConfirmDraft}
                  disabled={confirming || draft.status !== 'ready_for_review'}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] transition-all cursor-pointer"
                >
                  {confirming ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving to Database...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Confirm & Save Expense</span>
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
