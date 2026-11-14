'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Receipt, 
  Mic, 
  Bot, 
  ArrowUpRight, 
  Zap,
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import { ShadowPulseDot } from '@/components/ui/ShadowLoader';

interface HeroSectionProps {
  onDemoClick: () => void;
  demoLoading: boolean;
}

export function HeroSection({ onDemoClick, demoLoading }: HeroSectionProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative isolate overflow-hidden pt-6 pb-14 sm:pt-12 sm:pb-20">
      {/* Cinematic Ambient Glow & Subtle Parallax Mesh */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center overflow-hidden"
      >
        <div 
          className="h-[450px] w-[600px] sm:h-[650px] sm:w-[900px] rounded-full bg-gradient-to-tr from-indigo-500/20 via-purple-500/15 to-emerald-500/10 blur-3xl transform-gpu transition-transform duration-1000 ease-out animate-pulse"
          style={{ animationDuration: '8s' }}
        />
        <div 
          className="absolute -top-24 right-1/4 h-80 w-80 rounded-full bg-indigo-600/10 blur-3xl"
        />
        <div 
          className="absolute -bottom-20 left-1/4 h-96 w-96 rounded-full bg-violet-600/10 blur-3xl"
        />
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Stagger 1: Badge */}
        <div 
          className={`inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-indigo-50/80 px-4 py-1.5 text-xs font-semibold text-indigo-700 dark:border-indigo-800/80 dark:bg-indigo-950/70 dark:text-indigo-300 shadow-sm backdrop-blur-md transition-all duration-700 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 animate-spin" style={{ animationDuration: '10s' }} />
          <span>Expense Sharing for the Real World • Powered by Gemini AI</span>
        </div>

        {/* Stagger 2: Hero Headline */}
        <h1 
          className={`mt-6 text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-6xl lg:text-7xl leading-[1.12] transition-all duration-700 delay-100 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          Never argue over{' '}
          <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
            who owes what
          </span>{' '}
          again.
        </h1>

        {/* Stagger 3: Subtitle with human-friendly focus */}
        <p 
          className={`mx-auto mt-6 max-w-2xl text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed font-normal transition-all duration-700 delay-200 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          Snap the paper receipt, speak your bill naturally, or let AI calculate itemized shares with zero awkwardness. No calculator math. No lost pennies. 100% fair.
        </p>

        {/* Stagger 4: Primary & Secondary CTAs */}
        <div 
          className={`mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 transition-all duration-700 delay-300 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <button
            onClick={onDemoClick}
            disabled={demoLoading}
            className={`flex min-h-[50px] w-full sm:w-auto items-center justify-center gap-2.5 rounded-2xl bg-indigo-600 px-7 font-bold text-sm text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 hover:shadow-xl hover:shadow-indigo-600/40 active:scale-[0.98] transition-all cursor-pointer ${
              demoLoading ? 'animate-shadow-pulse pointer-events-none' : ''
            }`}
          >
            {demoLoading ? (
              <>
                <ShadowPulseDot variant="white" />
                <span>Opening Live Demo...</span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 text-amber-300 fill-amber-300" />
                <span>Try 1-Click Instant Demo</span>
              </>
            )}
          </button>

          <Link
            href="/signup"
            className="flex min-h-[50px] w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white/90 px-6 font-semibold text-sm text-zinc-900 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-white dark:hover:bg-zinc-800 shadow-sm active:scale-[0.98] transition-all"
          >
            <span>Create Free Account</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/login"
            className="flex min-h-[50px] w-full sm:w-auto items-center justify-center gap-1.5 rounded-2xl px-5 font-semibold text-sm text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 active:scale-[0.98] transition-all"
          >
            <span>Sign In</span>
          </Link>
        </div>

        {/* Micro-Trust Badges */}
        <div 
          className={`mt-10 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs text-zinc-500 dark:text-zinc-400 transition-all duration-700 delay-400 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            No App Store Install Required
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Penny-Perfect (Zero Rounding Errors)
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Instant UPI & Cash Settlement
          </span>
        </div>

        {/* Stagger 5: Cinematic Interactive Hero Card Showcase */}
        <div 
          className={`mt-10 sm:mt-12 mx-auto max-w-4xl transition-all duration-1000 delay-500 ${
            mounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-[0.97]'
          }`}
        >
          <div className="relative rounded-3xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white/80 dark:bg-zinc-900/80 p-4 sm:p-7 shadow-2xl shadow-indigo-500/10 backdrop-blur-xl text-left">
            {/* Header simulation bar */}
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-amber-400" />
                <div className="h-3 w-3 rounded-full bg-emerald-400" />
                <span className="ml-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  Goa Vacation • Dinner at Fisherman's Wharf
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-3 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-3 w-3" />
                Settled Perfectly
              </span>
            </div>

            {/* Split Scenario Visual */}
            <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
              {/* Left Column: Scanned Bill + Voice Instruction */}
              <div className="md:col-span-6 space-y-3.5">
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/70 p-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
                    <span className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100">
                      <Receipt className="h-3.5 w-3.5 text-indigo-500" />
                      Scanned Restaurant Bill
                    </span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">₹3,840.00</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                    <div className="flex justify-between">
                      <span>Butter Garlic Prawns</span>
                      <span>₹850.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fish Curry Rice (x3)</span>
                      <span>₹1,290.00</span>
                    </div>
                    <div className="flex justify-between text-violet-600 dark:text-violet-400 font-semibold">
                      <span>Craft Beer & Mocktails (x4)</span>
                      <span>₹1,700.00</span>
                    </div>
                  </div>
                </div>

                {/* Natural Language Voice Instruction */}
                <div className="rounded-2xl border border-violet-200/80 dark:border-violet-900/60 bg-gradient-to-r from-violet-50/80 to-indigo-50/60 dark:from-violet-950/40 dark:to-indigo-950/30 p-3.5">
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white shadow-xs">
                      <Mic className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                        Plain-English Voice Command
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-700 dark:text-zinc-300 italic">
                        &ldquo;Priya only had drinks. Split the food equally between Rahul, Vikram and me.&rdquo;
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: AI Resolution & Simplified Debts */}
              <div className="md:col-span-6 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <Bot className="h-3.5 w-3.5 text-indigo-500" />
                  Instant Penny-Perfect Resolution
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3.5 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400 font-bold text-[10px]">
                        P
                      </div>
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">Priya (Drinks Only)</span>
                    </div>
                    <span className="font-mono font-bold text-zinc-900 dark:text-white">₹425.00</span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3.5 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold text-[10px]">
                        R
                      </div>
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">Rahul (Food + Drinks)</span>
                    </div>
                    <span className="font-mono font-bold text-zinc-900 dark:text-white">₹1,138.33 → ₹1,139.00</span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3.5 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                        V
                      </div>
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">Vikram (Food + Drinks)</span>
                    </div>
                    <span className="font-mono font-bold text-zinc-900 dark:text-white">₹1,138.33 → ₹1,138.00</span>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/50 px-3.5 py-2 text-[11px] text-emerald-800 dark:text-emerald-300">
                  <span className="font-medium">&Sigma; Net Balance = ₹0.00</span>
                  <span className="font-bold">Zero Remainder Loss</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
