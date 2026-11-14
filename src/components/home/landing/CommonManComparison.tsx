'use client';

import { useScrollReveal } from './useScrollReveal';
import { XCircle, CheckCircle2, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';

export function CommonManComparison() {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.1 });

  return (
    <section ref={ref} className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Section Header */}
      <div 
        className={`text-center max-w-3xl mx-auto transition-all duration-700 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 px-3.5 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300">
          <Sparkles className="h-3.5 w-3.5" />
          <span>The Everyday Difference</span>
        </div>
        <h2 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-tight">
          Why Splitting Bills Usually Sucks <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            (And How Pank Solves It)
          </span>
        </h2>
        <p className="mt-4 text-base text-zinc-600 dark:text-zinc-400">
          We built Pank because we were tired of being the friend stuck doing 20 minutes of mental arithmetic after every group dinner.
        </p>
      </div>

      {/* Comparison Grid */}
      <div className="mt-14 sm:mt-18 grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        
        {/* Old Way */}
        <div 
          className={`rounded-3xl border border-rose-200/80 dark:border-rose-900/40 bg-gradient-to-b from-rose-50/50 to-white/90 dark:from-rose-950/20 dark:to-zinc-900/90 p-6 sm:p-8 shadow-sm transition-all duration-700 delay-150 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
              <XCircle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                The Old Headache
              </h3>
              <p className="text-xs text-rose-700 dark:text-rose-400 font-medium">
                Phone calculators, guesswork & awkward reminders
              </p>
            </div>
          </div>

          <ul className="mt-7 space-y-4 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            <li className="flex items-start gap-3">
              <XCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
              <span>
                <strong className="text-zinc-900 dark:text-zinc-200">Receipt math arguments:</strong> Passing around a crumpled paper bill, trying to figure out who ate what while everyone just wants to leave.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <XCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
              <span>
                <strong className="text-zinc-900 dark:text-zinc-200">The 33-paise bug:</strong> Dividing ₹1,000 by 3 gives ₹333.33. Someone always ends up shortchanged or overpaying.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <XCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
              <span>
                <strong className="text-zinc-900 dark:text-zinc-200">Circular debt web:</strong> Rahul owes Arjun ₹800, Arjun owes Priya ₹800, and Priya owes Rahul ₹800. Three unnecessary bank transfers!
              </span>
            </li>
            <li className="flex items-start gap-3">
              <XCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
              <span>
                <strong className="text-zinc-900 dark:text-zinc-200">Awkward WhatsApp nudges:</strong> &ldquo;Hey bro, did you get my UPI request?&rdquo; Nobody likes asking friends for money.
              </span>
            </li>
          </ul>
        </div>

        {/* The Pank Way */}
        <div 
          className={`rounded-3xl border border-indigo-200 dark:border-indigo-800/80 bg-gradient-to-b from-indigo-50/50 to-white/90 dark:from-indigo-950/30 dark:to-zinc-900/90 p-6 sm:p-8 shadow-xl shadow-indigo-500/10 transition-all duration-700 delay-300 relative overflow-hidden ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          {/* Subtle glow accent */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 h-48 w-48 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                The Pank Way
              </h3>
              <p className="text-xs text-indigo-700 dark:text-indigo-400 font-medium">
                Snap, speak, and walk away. Settled in seconds.
              </p>
            </div>
          </div>

          <ul className="mt-7 space-y-4 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
              <span>
                <strong className="text-zinc-900 dark:text-white">Snap & walk away:</strong> Our vision AI reads items, taxes, and service charges directly from your photo.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
              <span>
                <strong className="text-zinc-900 dark:text-white">Penny-Perfect math:</strong> Deterministic integer rounding ensures the sum of all shares strictly equals the total bill. Zero loss.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
              <span>
                <strong className="text-zinc-900 dark:text-white">Automatic debt cancellation:</strong> Circular IOUs cancel out automatically, cutting 10 transfers down to just 2 or 3.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
              <span>
                <strong className="text-zinc-900 dark:text-white">1-Tap UPI & Cash:</strong> Settle debts with Google Pay, PhonePe, Paytm, or record cash handoffs instantly.
              </span>
            </li>
          </ul>
        </div>

      </div>
    </section>
  );
}
