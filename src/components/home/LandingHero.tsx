'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, 
  ArrowRight, 
  Scale, 
  Users, 
  ShieldCheck, 
  Calculator,
  Receipt,
  CheckCircle2,
  Zap,
  Bot
} from 'lucide-react';
import { ShadowPulseDot } from '@/components/ui/ShadowLoader';

export function LandingHero() {
  const router = useRouter();
  const [demoLoading, setDemoLoading] = useState(false);

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    try {
      const res = await fetch('/api/auth/demo', { method: 'POST' });
      if (res.ok) {
        window.location.href = '/';
      }
    } catch (err) {
      console.error('Demo login error:', err);
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="relative isolate overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-indigo-500 to-purple-400 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
          }}
        />
      </div>

      <div className="mx-auto max-w-5xl px-3.5 py-12 sm:px-6 sm:py-28 lg:px-8 text-center">
        {/* Category Pill with Ambient Shadow */}
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-indigo-50/80 px-3.5 py-1.5 text-[11px] sm:text-xs font-bold text-indigo-700 dark:border-indigo-800/80 dark:bg-indigo-950/60 dark:text-indigo-300 shadow-sm shadow-indigo-500/10 max-w-full">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
          <span className="truncate">Deterministic Paired Accounting + Gemini AI</span>
        </div>

        {/* Headline with strict typographic hierarchy */}
        <h1 className="mt-6 sm:mt-8 text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-6xl lg:text-7xl leading-tight">
          Split Expenses with{' '}
          <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 bg-clip-text text-transparent">
            Penny-Perfect Precision
          </span>
        </h1>

        {/* Subtitle with generous line-height */}
        <p className="mx-auto mt-4 sm:mt-6 max-w-2xl text-sm sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed">
          Zero rounding losses guaranteed by Hare-Niemeyer math. Multi-payer bills, exact minor currency shares, greedy debt simplification, and natural language Gemini AI expense parsing.
        </p>

        {/* Primary and Secondary CTAs with clear Visual Hierarchy */}
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <button
            onClick={handleDemoLogin}
            disabled={demoLoading}
            className={`flex min-h-[48px] w-full sm:w-auto items-center justify-center gap-2.5 rounded-xl bg-indigo-600 px-7 font-bold text-sm text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 hover:shadow-xl hover:shadow-indigo-600/40 active:scale-[0.98] transition-all cursor-pointer ${
              demoLoading ? 'animate-shadow-pulse pointer-events-none' : ''
            }`}
          >
            {demoLoading ? (
              <>
                <ShadowPulseDot variant="white" />
                <span>Launching Instant Demo...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-amber-300" />
                <span>Try 1-Click Instant Demo</span>
              </>
            )}
          </button>

          <Link
            href="/login"
            className="flex min-h-[48px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-6 font-bold text-sm text-zinc-800 hover:bg-zinc-50 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 active:scale-[0.98] transition-all"
          >
            Sign In
          </Link>

          <Link
            href="/signup"
            className="flex min-h-[48px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl px-5 font-semibold text-sm text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-900 active:scale-[0.98] transition-all"
          >
            <span>Register</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Trust Badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            &Sigma; NetBalance = 0 Verified
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Instant UPI & Cash Settlement
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Receipt OCR & Audio Split
          </span>
        </div>

        {/* Features Grid with generous padding & elevation */}
        <div className="mt-20 grid grid-cols-1 gap-6 sm:grid-cols-3 text-left">
          <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-7 shadow-sm backdrop-blur hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 dark:border-zinc-800 dark:bg-zinc-900/80 transition-all duration-300">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 shadow-sm shadow-indigo-500/10">
              <Scale className="h-6 w-6" />
            </div>
            <h3 className="mt-5 text-base font-bold text-zinc-900 dark:text-white">
              Largest Remainder Rounding
            </h3>
            <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Never lose a single cent or paisa. Integer minor currency units with Hare-Niemeyer guarantee zero-sum balance: &Sigma; NetBalance = 0 across all participants.
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-7 shadow-sm backdrop-blur hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/10 dark:border-zinc-800 dark:bg-zinc-900/80 transition-all duration-300">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400 shadow-sm shadow-purple-500/10">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="mt-5 text-base font-bold text-zinc-900 dark:text-white">
              Multi-Payer & Custom Splits
            </h3>
            <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Multiple people can co-fund a single bill. Split equally, by exact minor units, percentages, or proportional shares with real-time domain validation.
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-7 shadow-sm backdrop-blur hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10 dark:border-zinc-800 dark:bg-zinc-900/80 transition-all duration-300">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 shadow-sm shadow-emerald-500/10">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="mt-5 text-base font-bold text-zinc-900 dark:text-white">
              Greedy Debt Simplification
            </h3>
            <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Greedy min-cash-flow reduction nets out circular debts, finding the absolute minimum number of real payments required for everyone to be settled.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
