'use client';

import { useScrollReveal } from './useScrollReveal';
import { 
  Camera, 
  Mic, 
  Bot, 
  PieChart, 
  ShieldCheck, 
  Smartphone,
  Scale,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';

interface FeatureItem {
  icon: typeof Camera;
  badge?: string;
  title: string;
  simpleHeadline: string;
  description: string;
  accent: string;
  iconBg: string;
}

const features: FeatureItem[] = [
  {
    icon: Camera,
    badge: 'Vision AI',
    title: 'Snap & Itemize Bills',
    simpleHeadline: 'Take a photo of any restaurant receipt',
    description: 'No typing out 15 dishes. Vision AI reads line items, quantities, prices, taxes, and service fees in seconds.',
    accent: 'hover:border-indigo-400 dark:hover:border-indigo-700',
    iconBg: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400',
  },
  {
    icon: Mic,
    badge: 'Voice AI',
    title: 'Natural Speech Input',
    simpleHeadline: 'Talk to it like you talk to a friend',
    description: 'Just speak: "I paid ₹3,200 for groceries with Alex and Sam". Pank transcribes in real-time and resolves members automatically.',
    accent: 'hover:border-violet-400 dark:hover:border-violet-700',
    iconBg: 'bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400',
  },
  {
    icon: Bot,
    badge: 'Gemini Assistant',
    title: 'Chat Group Assistant',
    simpleHeadline: 'Ask questions about who owes what',
    description: 'Got confused after a 4-day vacation? Just ask: "Who owes whom right now?" and get instant plain-English summaries.',
    accent: 'hover:border-purple-400 dark:hover:border-purple-700',
    iconBg: 'bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
  },
  {
    icon: PieChart,
    badge: 'NEW Feature',
    title: 'Visual Spending Insights',
    simpleHeadline: 'See where your group money actually went',
    description: 'Interactive category donut charts (Food, Travel, Stays, Groceries), monthly spending velocity timelines, and top companion split matrix.',
    accent: 'hover:border-emerald-400 dark:hover:border-emerald-700',
    iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
  },
  {
    icon: ShieldCheck,
    badge: 'Math Engine',
    title: 'Greedy Debt Simplification',
    simpleHeadline: 'Cut 10 confusing transfers down to 2',
    description: 'Graph-based min-cash-flow reduction eliminates circular debts. Settle up in the minimum possible number of UPI payments.',
    accent: 'hover:border-amber-400 dark:hover:border-amber-700',
    iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
  },
  {
    icon: Scale,
    badge: 'Guaranteed Precision',
    title: 'Penny-Perfect Hare-Niemeyer',
    simpleHeadline: 'Zero rounding loss. Ever.',
    description: 'All calculations are kept in integer minor currency units (paise/cents). Even if 3 people split ₹100, the sum strictly equals ₹100.00.',
    accent: 'hover:border-blue-400 dark:hover:border-blue-700',
    iconBg: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
  },
];

export function FeaturesGrid() {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.1 });

  return (
    <section ref={ref} className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Header */}
      <div 
        className={`text-center max-w-3xl mx-auto transition-all duration-700 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 px-3.5 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Complete Feature Suite</span>
        </div>
        <h2 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-tight">
          Everything You Need. <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
            Nothing You Don&apos;t.
          </span>
        </h2>
        <p className="mt-4 text-base text-zinc-600 dark:text-zinc-400">
          Built for real groups of friends, flatmates, and couples who want quick clarity without spreadsheets.
        </p>
      </div>

      {/* Grid of Cards */}
      <div className="mt-14 sm:mt-18 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {features.map((feat, index) => {
          const Icon = feat.icon;
          return (
            <div
              key={index}
              className={`rounded-3xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white/80 dark:bg-zinc-900/80 p-7 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 backdrop-blur-sm flex flex-col justify-between ${feat.accent} ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
              style={{
                transitionDelay: `${100 + index * 80}ms`,
              }}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm ${feat.iconBg}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  {feat.badge && (
                    <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                      {feat.badge}
                    </span>
                  )}
                </div>

                <div className="mt-5 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  {feat.title}
                </div>

                <h3 className="mt-1 text-lg font-bold text-zinc-900 dark:text-white leading-snug">
                  {feat.simpleHeadline}
                </h3>

                <p className="mt-2.5 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {feat.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <span>Penny-perfect verified</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
