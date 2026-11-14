'use client';

import { useState } from 'react';
import { 
  Bot, 
  X, 
  Send, 
  User, 
  Sparkles, 
  HelpCircle, 
  Receipt, 
  Scale 
} from 'lucide-react';
import { ShadowPulseDot } from '@/components/ui/ShadowLoader';

interface GroupAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function GroupAssistantModal({
  isOpen,
  onClose,
  groupId,
  groupName,
}: GroupAssistantModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I am your AI Group Assistant for **${groupName}** powered by Gemini. You can ask me questions about group balances, spending totals, or who owes whom!`,
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();

  if (!isOpen) return null;

  const quickQuestions = [
    'Who owes whom right now?',
    'What is our total group spending?',
    'How can we settle all debts in the fewest payments?',
  ];

  const handleSend = async (queryToSend?: string) => {
    const q = (queryToSend || inputQuery).trim();
    if (!q || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: q,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery('');
    setLoading(true);

    try {
      const res = await fetch(`/api/groups/${groupId}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, sessionId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to get answer');
      }

      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: data.messageId || (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.answer,
        },
      ]);
    } catch (err: any) {
      const isRefusal =
        err.message?.startsWith('I can only help') ||
        err.message?.includes('maximum length');
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: isRefusal
            ? err.message
            : `Sorry, I encountered an issue: ${err.message || 'Please try again.'}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center bg-black/60 p-0 sm:p-4 backdrop-blur-md transition-all"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="w-full max-w-xl rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 overflow-hidden flex flex-col h-[650px] max-h-[92vh] animate-in fade-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Handle */}
        <div className="pt-3 pb-1 flex justify-center sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 py-3.5 sm:py-4 bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-500/20">
              <Bot className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span>Group AI Assistant</span>
                <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold px-2 py-0.5 border border-indigo-200 dark:border-indigo-800">
                  Gemini 2.5
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Ask about ledger balances, settlements & pairwise debts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            aria-label="Close assistant"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Chat message history */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-start gap-2.5 sm:gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
                }`}
              >
                {m.role === 'user' ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4 text-indigo-500" />}
              </div>

              <div
                className={`max-w-[85%] sm:max-w-[82%] rounded-2xl px-3.5 sm:px-4.5 py-2.5 sm:py-3 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap shadow-xs ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 rounded-tl-none border border-zinc-200/50 dark:border-zinc-700/50'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 px-3.5 sm:px-4 py-2.5 text-xs text-indigo-700 dark:text-indigo-300 animate-in fade-in animate-shadow-pulse">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
              </span>
              <span className="font-semibold animate-pulse text-xs">Gemini AI is analyzing financial ledger...</span>
            </div>
          )}
        </div>

        {/* Quick prompt suggestions */}
        <div className="px-4 sm:px-6 py-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 shrink-0">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(q)}
                disabled={loading}
                className="whitespace-nowrap min-h-[44px] rounded-xl bg-white dark:bg-zinc-800 px-3.5 py-2 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 active:scale-[0.98] transition-all shrink-0 cursor-pointer shadow-2xs font-medium"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input footer with Safe Area */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 sm:p-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-2.5 shrink-0"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask anything about balances, debts..."
            disabled={loading}
            maxLength={300}
            className="flex-1 min-h-[44px] rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 sm:px-4 py-2.5 text-base sm:text-sm text-zinc-900 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white transition-all"
          />
          <button
            type="submit"
            disabled={loading || !inputQuery.trim()}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm hover:bg-indigo-500 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.95] transition-all cursor-pointer ${
              loading ? 'animate-shadow-pulse pointer-events-none' : ''
            }`}
            aria-label="Send message"
          >
            {loading ? <ShadowPulseDot /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
