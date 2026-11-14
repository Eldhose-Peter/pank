'use client';

import Link from 'next/link';
import { Sparkles, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import { ShadowPulseDot } from '@/components/ui/ShadowLoader';
import { useScrollReveal } from './useScrollReveal';

interface CtaSectionProps {
  onDemoClick: () => void;
  demoLoading: boolean;
}

export function CtaSection({ onDemoClick, demoLoading }: CtaSectionProps) {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.1 });

  return (
    <section ref={ref} className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <div 
        className={`relative overflow-hidden rounded-3xl border border-indigo-200/80 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-900 via-indigo-950 to-zinc-950 px-6 py-12 sm:px-12 sm:py-16 text-center text-white shadow-2xl transition-all duration-700 ${
          isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-[0.98]'
        }`}
      >
        {/* Ambient Glows */}
        <div 
          aria-hidden="true" 
          className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" 
        />
        <div 
          aria-hidden="true" 
          className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" 
        />

        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold text-indigo-300 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>Ready in 10 Seconds • Zero Setup</span>
          </div>

          <h2 className="mt-6 text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Stop doing bill math. <br />
            Start splitting the smart way.
          </h2>

          <p className="mt-4 text-sm sm:text-base text-indigo-200/90 leading-relaxed max-w-lg mx-auto">
            Try the instant live interactive demo right now with preloaded groups, or create a free account to invite your friends.
          </p>

          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={onDemoClick}
              disabled={demoLoading}
              className={`flex min-h-[50px] w-full sm:w-auto items-center justify-center gap-2.5 rounded-2xl bg-white px-8 font-bold text-sm text-indigo-950 shadow-xl hover:bg-zinc-100 active:scale-[0.98] transition-all cursor-pointer ${
                demoLoading ? 'animate-shadow-pulse pointer-events-none' : ''
              }`}
            >
              {demoLoading ? (
                <>
                  <ShadowPulseDot variant="primary" />
                  <span>Loading Live Demo...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
                  <span>Try 1-Click Instant Demo</span>
                </>
              )}
            </button>

            <Link
              href="/signup"
              className="flex min-h-[50px] w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border border-indigo-400/30 bg-indigo-950/60 px-6 font-semibold text-sm text-white hover:bg-indigo-900/60 active:scale-[0.98] transition-all"
            >
              <span>Create Free Account</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-indigo-300/80">
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              100% Free Forever for Personal Groups
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              No App Download Needed
            </span>
          </div>
        </div>
      </div>

      {/* Minimalist Premium Footer */}
      <footer className="mt-20 pt-8 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white font-extrabold text-xs">
            P
          </div>
          <span>Pank</span>
          <span className="font-normal text-zinc-400 dark:text-zinc-500">
            • Deterministic Expense Splitting & AI Accounting
          </span>
        </div>

        <div className="flex items-center gap-6">
          <Link href="/login" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
            Sign In
          </Link>
          <Link href="/signup" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
            Create Account
          </Link>
          <span>&copy; {new Date().getFullYear()} Pank. All rights reserved.</span>
        </div>
      </footer>
    </section>
  );
}
