'use client';

import { useState, useCallback, useRef } from 'react';
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
  Edit2,
  Mic,
  MicOff,
  Zap,
  Volume2,
  Camera,
  FileText,
  ExternalLink,
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

  // Bill / receipt upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [billParsing, setBillParsing] = useState(false);
  const [showReceiptItems, setShowReceiptItems] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleBillUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setError('File is too large. Maximum size is 15MB.');
      return;
    }

    setSelectedFile(file);
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

  // Phase 1: Web Speech API (browser-native, free)
  const {
    isListening,
    isSupported: webSpeechSupported,
    transcript: interimTranscript,
    toggleListening: toggleWebSpeech,
    stopListening: stopWebSpeech,
  } = useVoiceInput({
    lang: 'en-IN',
    onResult: (text) => {
      setPromptText((prev) => (prev ? `${prev} ${text}` : text));
    },
    onError: (err) => setError(err),
  });

  // Phase 2: Gemini multimodal audio (records blob, sends to backend)
  const {
    isRecording,
    isSupported: recorderSupported,
    startRecording,
    stopRecording,
  } = useAudioRecorder({
    onError: (err) => setError(err),
  });

  const voiceSupported = webSpeechSupported || recorderSupported;

  const handleGeminiVoiceStop = useCallback(async () => {
    const audioBlob = await stopRecording();
    if (!audioBlob || audioBlob.size === 0) {
      setError('No audio recorded. Please try again.');
      return;
    }

    setVoiceParsing(true);
    setError(null);
    setDraft(null);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice-expense.webm');

      const res = await fetch(`/api/groups/${groupId}/ai/voice-parse`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to parse voice input');
      }

      // Fill the text field with the transcript so the user can see what was heard
      if (data.transcript) {
        setPromptText(data.transcript);
      }

      setDraft(data.draft);
      setEditTitle(data.draft.title);
      setEditAmount((data.draft.amount / 100).toString());
      setClarificationAnswers({});
    } catch (err: any) {
      setError(err.message || 'Error processing voice input');
    } finally {
      setVoiceParsing(false);
    }
  }, [stopRecording, groupId]);

  const handleMicToggle = useCallback(async () => {
    setError(null);
    if (voiceMode === 'browser') {
      if (!webSpeechSupported) {
        // Fallback to Gemini voice if browser lacks Web Speech API
        setError('Browser speech is not supported in this browser. Switching to Gemini AI mode...');
        setVoiceMode('gemini');
        try {
          await startRecording();
        } catch (err: any) {
          setError(err.message || 'Microphone access failed');
        }
        return;
      }
      toggleWebSpeech();
    } else {
      // Gemini mode: toggle recording
      if (isRecording) {
        await handleGeminiVoiceStop();
      } else {
        await startRecording();
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
    const text = (textToParse || promptText).trim();
    if (!text && !selectedFile) return;

    setError(null);
    setDraft(null);

    // If a bill/receipt is selected, use the bill-parse endpoint
    if (selectedFile) {
      setBillParsing(true);
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        if (text) {
          formData.append('instructions', text);
        }

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
      } catch (err: any) {
        setError(err.message || 'Error scanning bill');
      } finally {
        setBillParsing(false);
      }
      return;
    }

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
    handleRemoveFile();
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
                  Gemini Flash
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Type, speak, or upload a bill to extract and split automatically
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
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Expense Description
              </label>

              {/* Voice Mode Toggle (Always Visible) */}
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center rounded-lg bg-zinc-100 dark:bg-zinc-800 p-0.5 text-[11px] font-medium border border-zinc-200 dark:border-zinc-700">
                  <button
                    type="button"
                    onClick={() => {
                      if (isVoiceActive) return;
                      setVoiceMode('browser');
                    }}
                    disabled={isVoiceActive}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 transition-all ${
                      voiceMode === 'browser'
                        ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-sm font-semibold'
                        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                    } disabled:opacity-60`}
                    title="Browser-native Speech Recognition (Instant, Free)"
                  >
                    <Zap className="h-3 w-3" />
                    Browser
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (isVoiceActive) return;
                      setVoiceMode('gemini');
                    }}
                    disabled={isVoiceActive}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 transition-all ${
                      voiceMode === 'gemini'
                        ? 'bg-white dark:bg-zinc-700 text-violet-600 dark:text-violet-400 shadow-sm font-semibold'
                        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                    } disabled:opacity-60`}
                    title="Gemini Multimodal Voice (Higher Accuracy, Multilingual)"
                  >
                    <Sparkles className="h-3 w-3" />
                    Gemini AI
                  </button>
                </div>
              </div>
            </div>

            {/* File Upload Hidden Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleBillUpload}
            />

            {/* Selected Bill Preview Chip */}
            {selectedFile && (
              <div className="mb-2 flex items-center justify-between rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 p-2.5 text-xs animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  {filePreviewUrl ? (
                    <img
                      src={filePreviewUrl}
                      alt="Receipt preview"
                      className="h-9 w-9 rounded-lg object-cover border border-indigo-200 shadow-sm"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600">
                      <FileText className="h-5 w-5" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-indigo-900 dark:text-indigo-200 truncate max-w-[260px]">
                      {selectedFile.name}
                    </p>
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400">
                      {(selectedFile.size / 1024).toFixed(0)} KB · Ready to scan with Gemini 2.5 Flash Vision
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="rounded-lg p-1 text-zinc-400 hover:bg-white hover:text-red-500 dark:hover:bg-zinc-800 transition-colors"
                  title="Remove bill"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="relative">
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                rows={3}
                placeholder={
                  selectedFile
                    ? 'Optional: Add split instructions (e.g. "Alice ate pizza, Bob paid for drinks") or leave blank to split equally.'
                    : isVoiceActive
                    ? voiceMode === 'browser'
                      ? '🎤 Listening... speak your expense now'
                      : '🎤 Recording... tap "Stop Rec" when finished'
                    : 'e.g. I paid ₹2,400 for dinner. Split it equally between me, Rahul, Priya and Arjun.'
                }
                className={`w-full rounded-xl border bg-white px-3.5 py-2.5 pb-12 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 dark:bg-zinc-950 dark:text-white resize-none transition-colors ${
                  isVoiceActive
                    ? 'border-red-400 dark:border-red-600 ring-2 ring-red-500/20'
                    : 'border-zinc-200 dark:border-zinc-800'
                }`}
                disabled={parsing || voiceParsing || billParsing}
              />

              {/* Action buttons inside textarea: Upload Bill + Voice Mic + Extract Draft */}
              <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1.5">
                {/* Upload Bill Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={parsing || voiceParsing || billParsing}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow-sm transition-all disabled:opacity-50 ${
                    selectedFile
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700'
                  }`}
                  title="Upload or snap a bill / receipt (PNG, JPG, PDF)"
                >
                  <Camera className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                  <span>{selectedFile ? 'Change Bill' : 'Upload Bill'}</span>
                </button>

                {/* Voice Speak / Mic Button */}
                <button
                  type="button"
                  onClick={handleMicToggle}
                  disabled={parsing || voiceParsing || billParsing}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow-sm transition-all disabled:opacity-50 ${
                    isVoiceActive
                      ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-500/30'
                      : voiceParsing
                      ? 'bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-300 border border-violet-300 dark:border-violet-800'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700'
                  }`}
                  title={
                    isVoiceActive
                      ? voiceMode === 'browser'
                        ? 'Stop listening'
                        : 'Stop recording & parse'
                      : `Click to speak using ${voiceMode === 'browser' ? 'Browser Speech' : 'Gemini AI Voice'}`
                  }
                >
                  {voiceParsing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Transcribing...</span>
                    </>
                  ) : isVoiceActive ? (
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

                {/* Extract / Scan Bill Draft button */}
                <button
                  type="button"
                  onClick={() => handleParse()}
                  disabled={parsing || voiceParsing || billParsing || (!promptText.trim() && !selectedFile)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 disabled:pointer-events-none transition-all"
                >
                  {parsing || billParsing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>{billParsing ? 'Scanning Bill...' : 'Parsing...'}</span>
                    </>
                  ) : selectedFile ? (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Scan Bill</span>
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
              <div className="mt-2 flex items-center justify-between rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 px-3 py-1.5 text-xs text-red-600 dark:text-red-400 animate-in fade-in">
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
                  className="font-bold underline hover:no-underline text-xs"
                >
                  {voiceMode === 'browser' ? 'Done' : 'Process Audio'}
                </button>
              </div>
            )}

            {voiceParsing && (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-900/50 px-3 py-1.5 text-xs text-violet-600 dark:text-violet-400 animate-in fade-in">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="font-medium">
                  Uploading audio to Gemini multimodal AI for transcription & split calculation...
                </span>
              </div>
            )}

            {billParsing && (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 px-3 py-1.5 text-xs text-indigo-600 dark:text-indigo-400 animate-in fade-in">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="font-medium">
                  Scanning receipt with Gemini 2.5 Flash Vision OCR & extracting amounts...
                </span>
              </div>
            )}

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
                      {draft.receiptUrl && (
                        <a
                          href={draft.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 mt-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800"
                        >
                          <Receipt className="h-3 w-3" />
                          View Attached Bill
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-base font-extrabold text-zinc-900 dark:text-white">
                        {formatMinorUnits(draft.amount, draft.currency)}
                      </div>
                      <div className="text-[11px] text-zinc-400 capitalize">{draft.splitType} split</div>
                    </div>
                  </div>
                )}

                {/* Scanned Bill Line Items Breakdown (if present) */}
                {draft.receiptItems && draft.receiptItems.length > 0 && (
                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setShowReceiptItems((prev) => !prev)}
                      className="flex items-center justify-between w-full text-[11px] font-semibold text-zinc-500 uppercase tracking-wider hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                    >
                      <span className="flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5 text-indigo-500" />
                        Scanned Bill Items ({draft.receiptItems.length})
                      </span>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400">
                        {showReceiptItems ? 'Hide Items ▲' : 'Show Items ▼'}
                      </span>
                    </button>
                    {showReceiptItems && (
                      <div className="mt-2 space-y-1 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 p-2 text-xs divide-y divide-zinc-200/50 dark:divide-zinc-800">
                        {draft.receiptItems.map((item, idx) => (
                          <div key={idx} className="flex justify-between py-1 text-zinc-700 dark:text-zinc-300 first:pt-0 last:pb-0">
                            <span className="truncate pr-2">{item.name}</span>
                            <span className="font-semibold text-zinc-900 dark:text-white shrink-0">
                              {getCurrencySymbol(draft.currency)}{item.amount.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
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
