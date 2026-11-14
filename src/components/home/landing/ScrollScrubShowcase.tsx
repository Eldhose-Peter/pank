'use client';

import { useScrollProgress } from './useScrollProgress';
import { 
  Camera, 
  MessageSquare, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Layers, 
  Receipt,
  Mic,
  Coins
} from 'lucide-react';

export function ScrollScrubShowcase() {
  const { containerRef, progress } = useScrollProgress();

  // Divide progress into 3 distinct active phases:
  // Phase 0: 0.00 -> 0.33
  // Phase 1: 0.33 -> 0.66
  // Phase 2: 0.66 -> 1.00
  const activeStep = progress < 0.33 ? 0 : progress < 0.66 ? 1 : 2;

  // Compute smooth hardware-accelerated transforms for each stage:
  // Stage 1 opacity & translation: active near start, fades as scroll continues
  const stage1Opacity = Math.max(0, Math.min(1, 1 - Math.max(0, (progress - 0.25) / 0.15)));
  const stage1Translate = (progress > 0.25 ? (progress - 0.25) * -120 : 0);

  // Stage 2 opacity & translation: enters at 0.30, peaks at 0.50, exits at 0.65
  const stage2Opacity = 
    progress < 0.25 
      ? 0 
      : progress < 0.38 
        ? (progress - 0.25) / 0.13 
        : progress > 0.62 
          ? Math.max(0, 1 - (progress - 0.62) / 0.12)
          : 1;
  const stage2Translate = 
    progress < 0.35 
      ? (0.35 - progress) * 80 
      : progress > 0.62 
        ? (progress - 0.62) * -100 
        : 0;

  // Stage 3 opacity & translation: enters at 0.60, stays active to end
  const stage3Opacity = Math.max(0, Math.min(1, (progress - 0.60) / 0.15));
  const stage3Translate = progress < 0.60 ? (0.60 - progress) * 80 : 0;

  return (
    <div ref={containerRef} className="relative h-[250vh] sm:h-[280vh] w-full">
      {/* Sticky Frame: pinned to top of screen during the scroll journey */}
      <div className="sticky top-16 sm:top-20 h-[calc(100vh-4rem)] sm:h-[calc(100vh-5rem)] flex flex-col justify-between overflow-hidden py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
        
        {/* Top Header & Interactive Scrub Progress Bar */}
        <div className="mx-auto w-full max-w-5xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                <Layers className="h-3.5 w-3.5" />
                <span>Scroll-Driven Demonstration</span>
              </div>
              <h2 className="text-xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight mt-0.5">
                From Messy Bill to Settled in 3 Seconds
              </h2>
            </div>

            {/* Interactive Step Indicator Chips */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {[
                { label: '1. Scan Bill', active: activeStep === 0 },
                { label: '2. Speak Rules', active: activeStep === 1 },
                { label: '3. Instant Settle', active: activeStep === 2 },
              ].map((step, idx) => (
                <div
                  key={idx}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition-all duration-300 ${
                    step.active
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-105'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {step.label}
                </div>
              ))}
            </div>
          </div>

          {/* Smooth Hardware Scrub Progress Line */}
          <div className="h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 will-change-transform"
              style={{
                transformOrigin: 'left',
                transform: `scaleX(${progress})`,
              }}
            />
          </div>
        </div>

        {/* Center Stage: Animated Stage Cards */}
        <div className="relative mx-auto my-auto w-full max-w-5xl flex-1 flex items-center justify-center">
          
          {/* ================= STAGE 1: SCAN BILL ================= */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none will-change-transform"
            style={{
              opacity: stage1Opacity,
              transform: `translate3d(0, ${stage1Translate}px, 0)`,
              display: stage1Opacity <= 0 ? 'none' : 'flex',
            }}
          >
            <div className="w-full max-w-xl rounded-3xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white/95 dark:bg-zinc-900/95 p-5 sm:p-7 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                  <Camera className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                    Step 1: Point Camera & Upload
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    No manual typing. Vision AI extracts every line item with sub-second accuracy.
                  </p>
                </div>
              </div>

              {/* Simulated Paper Bill Preview */}
              <div className="mt-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4 font-mono text-xs space-y-2">
                <div className="flex justify-between border-b border-dashed border-zinc-300 dark:border-zinc-700 pb-2 font-bold text-zinc-900 dark:text-zinc-100">
                  <span>Olive Garden Bistro</span>
                  <span>Invoice #4029</span>
                </div>
                <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                  <span>1x Woodfired Truffle Pizza</span>
                  <span>₹750.00</span>
                </div>
                <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                  <span>2x Berry Lemonade Cooler</span>
                  <span>₹480.00</span>
                </div>
                <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                  <span>1x Garlic Parmesan Bread</span>
                  <span>₹280.00</span>
                </div>
                <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                  <span>5% GST + Service Tax</span>
                  <span>₹120.00</span>
                </div>
                <div className="flex justify-between border-t border-dashed border-zinc-300 dark:border-zinc-700 pt-2 font-bold text-zinc-900 dark:text-white text-sm">
                  <span>Total Amount</span>
                  <span>₹1,630.00</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-[11px] text-zinc-500">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" /> 4 items itemized
                </span>
                <span>Scroll down to add instructions &darr;</span>
              </div>
            </div>
          </div>

          {/* ================= STAGE 2: VOICE & NATURAL RULES ================= */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none will-change-transform"
            style={{
              opacity: stage2Opacity,
              transform: `translate3d(0, ${stage2Translate}px, 0)`,
              display: stage2Opacity <= 0 ? 'none' : 'flex',
            }}
          >
            <div className="w-full max-w-xl rounded-3xl border border-violet-200 dark:border-violet-900/60 bg-white/95 dark:bg-zinc-900/95 p-5 sm:p-7 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400">
                  <Mic className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                    Step 2: Tell AI in Plain English
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Just speak or type what happened. No complex manual math matrices.
                  </p>
                </div>
              </div>

              {/* Chat Speech Bubble */}
              <div className="mt-5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 p-4 text-white shadow-md">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-200 mb-1">
                  <Sparkles className="h-3 w-3" /> Voice Transcription
                </div>
                <p className="text-sm font-medium leading-relaxed">
                  &ldquo;Aarav didn&apos;t drink any Lemonade. Split the food between all 3 of us, but split drinks only between Me and Sneha.&rdquo;
                </p>
              </div>

              {/* AI Understanding breakdown */}
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-2.5">
                  <span className="text-zinc-600 dark:text-zinc-400">Pizza & Bread (₹1,030 + Tax)</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">Split 3 ways (Me, Sneha, Aarav)</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-2.5">
                  <span className="text-zinc-600 dark:text-zinc-400">Berry Lemonade (₹480 + Tax)</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">Split 2 ways (Me & Sneha only)</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-[11px] text-zinc-500">
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Gemini 2.5 parsed 100% of names</span>
                <span>Keep scrolling to see debt resolution &darr;</span>
              </div>
            </div>
          </div>

          {/* ================= STAGE 3: PENNY-PERFECT SETTLEMENT ================= */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none will-change-transform"
            style={{
              opacity: stage3Opacity,
              transform: `translate3d(0, ${stage3Translate}px, 0)`,
              display: stage3Opacity <= 0 ? 'none' : 'flex',
            }}
          >
            <div className="w-full max-w-xl rounded-3xl border border-emerald-200 dark:border-emerald-900/60 bg-white/95 dark:bg-zinc-900/95 p-5 sm:p-7 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                    Step 3: Zero Math. Ready to Pay.
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Circular debts collapse into minimal payments. Every single paisa is accounted for.
                  </p>
                </div>
              </div>

              {/* Settlement Cards */}
              <div className="mt-5 space-y-2.5">
                <div className="flex items-center justify-between rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/40 p-3.5">
                  <div>
                    <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                      Aarav pays You
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Food portion + share of tax
                    </div>
                  </div>
                  <span className="font-mono text-base font-extrabold text-emerald-700 dark:text-emerald-300">
                    ₹377.00
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/40 p-3.5">
                  <div>
                    <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                      Sneha pays You
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Food + Drinks portion + share of tax
                    </div>
                  </div>
                  <span className="font-mono text-base font-extrabold text-indigo-700 dark:text-indigo-300">
                    ₹626.00
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3.5 py-2 text-xs text-zinc-600 dark:text-zinc-300">
                  <span className="font-medium">Your personal consumption</span>
                  <span className="font-mono font-bold">₹627.00</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Total Received = ₹1,003.00 (Exact sum verified)
                </span>
                <span>100% Balanced</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Scroll Cue */}
        <div className="mx-auto text-center text-xs text-zinc-400 dark:text-zinc-500">
          <span>Scroll progress: {Math.round(progress * 100)}%</span>
        </div>

      </div>
    </div>
  );
}
