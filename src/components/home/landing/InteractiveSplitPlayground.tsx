'use client';

import { useState } from 'react';
import { useScrollReveal } from './useScrollReveal';
import { Sparkles, ArrowRight, CheckCircle2, RefreshCw, Zap, Users } from 'lucide-react';

interface Scenario {
  id: string;
  name: string;
  emoji: string;
  total: string;
  description: string;
  beforeTransfers: number;
  afterTransfers: number;
  settlements: {
    from: string;
    to: string;
    amount: string;
  }[];
  balances: {
    name: string;
    status: 'gets' | 'pays';
    amount: string;
  }[];
}

const scenarios: Scenario[] = [
  {
    id: 'dinner',
    name: 'Friday Dinner & Drinks',
    emoji: '🍕',
    total: '₹6,450.00',
    description: '4 friends out at an Italian lounge. Rahul paid dinner, Priya paid drinks.',
    beforeTransfers: 6,
    afterTransfers: 2,
    settlements: [
      { from: 'Arjun', to: 'Rahul', amount: '₹1,612.50' },
      { from: 'Sneha', to: 'Priya', amount: '₹1,225.00' },
    ],
    balances: [
      { name: 'Rahul', status: 'gets', amount: '+₹1,612.50' },
      { name: 'Priya', status: 'gets', amount: '+₹1,225.00' },
      { name: 'Arjun', status: 'pays', amount: '-₹1,612.50' },
      { name: 'Sneha', status: 'pays', amount: '-₹1,225.00' },
    ],
  },
  {
    id: 'vacation',
    name: 'Weekend Roadtrip',
    emoji: '🏖️',
    total: '₹28,600.00',
    description: '5 friends road trip. Fuel, resort villa, seafood lunch, and toll booths.',
    beforeTransfers: 10,
    afterTransfers: 3,
    settlements: [
      { from: 'Vikram', to: 'Aditi', amount: '₹5,720.00' },
      { from: 'Kavya', to: 'Aditi', amount: '₹3,450.00' },
      { from: 'Kavya', to: 'Rohan', amount: '₹2,270.00' },
    ],
    balances: [
      { name: 'Aditi (Paid Villa)', status: 'gets', amount: '+₹9,170.00' },
      { name: 'Rohan (Paid Fuel)', status: 'gets', amount: '+₹2,270.00' },
      { name: 'Vikram', status: 'pays', amount: '-₹5,720.00' },
      { name: 'Kavya', status: 'pays', amount: '-₹5,720.00' },
    ],
  },
  {
    id: 'flatmates',
    name: 'Flat Rent & Groceries',
    emoji: '🏠',
    total: '₹42,000.00',
    description: '3 flatmates. Rent, high-speed WiFi, electricity bill, and monthly maid.',
    beforeTransfers: 4,
    afterTransfers: 1,
    settlements: [
      { from: 'Sameer', to: 'Dev', amount: '₹14,000.00' },
    ],
    balances: [
      { name: 'Dev (Paid Rent)', status: 'gets', amount: '+₹14,000.00' },
      { name: 'Sameer', status: 'pays', amount: '-₹14,000.00' },
      { name: 'Nikhil (Paid WiFi/Bills)', status: 'gets', amount: '₹0.00 (Even)' },
    ],
  },
];

export function InteractiveSplitPlayground() {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.1 });
  const [selectedId, setSelectedId] = useState('dinner');

  const scenario = scenarios.find((s) => s.id === selectedId) || scenarios[0];

  return (
    <section ref={ref} className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Header */}
      <div 
        className={`text-center max-w-3xl mx-auto transition-all duration-700 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 px-3.5 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300">
          <Zap className="h-3.5 w-3.5" />
          <span>Interactive Playground</span>
        </div>
        <h2 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-tight">
          See Debt Simplification in Action
        </h2>
        <p className="mt-4 text-base text-zinc-600 dark:text-zinc-400">
          Pick a scenario below to see how our greedy min-cash-flow algorithm cuts messy IOUs down to the absolute minimum transfers.
        </p>

        {/* Scenario Toggle Chips */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
          {scenarios.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-300 cursor-pointer ${
                selectedId === s.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105'
                  : 'border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <span>{s.emoji}</span>
              <span>{s.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Visual Display */}
      <div 
        className={`mt-12 rounded-3xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white/90 dark:bg-zinc-900/90 p-6 sm:p-10 shadow-2xl backdrop-blur-xl transition-all duration-700 delay-200 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        {/* Top Info Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-zinc-100 dark:border-zinc-800 gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              <span>{scenario.emoji} Active Scenario</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white mt-1">
              {scenario.name}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {scenario.description}
            </p>
          </div>

          <div className="flex items-center gap-6 sm:text-right">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">Total Expense</div>
              <div className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-white font-mono">
                {scenario.total}
              </div>
            </div>
          </div>
        </div>

        {/* Transfer Reduction Comparison */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Before: Complex Transfers */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/70 p-5">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-500 uppercase tracking-wider">
              <span>Without Debt Simplification</span>
              <span className="text-rose-500 font-mono">{scenario.beforeTransfers} Separate Payments</span>
            </div>
            <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
              Everyone tries to pay each person who spent money separately. Circular debts linger for weeks.
            </p>
            <div className="mt-4 flex items-center justify-center py-6 text-zinc-400">
              <div className="flex items-center gap-3 text-xs">
                <span className="line-through text-rose-500 font-bold">{scenario.beforeTransfers} UPI transfers back and forth</span>
              </div>
            </div>
          </div>

          {/* After: Pank Min-Cash Flow */}
          <div className="rounded-2xl border border-emerald-200/90 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/30 p-5">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
              <span>With Pank Algorithm</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">Only {scenario.afterTransfers} Transfers!</span>
            </div>
            <p className="mt-2 text-xs text-emerald-800/80 dark:text-emerald-300/80">
              Min-cash flow cuts out circular loops. Everyone is fully settled with the minimum transfers.
            </p>

            {/* List of Simplified Payments */}
            <div className="mt-4 space-y-2">
              {scenario.settlements.map((st, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl bg-white dark:bg-zinc-900 border border-emerald-200/80 dark:border-emerald-900/60 px-3.5 py-2.5 text-xs shadow-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-900 dark:text-white">{st.from}</span>
                    <ArrowRight className="h-3 w-3 text-emerald-500" />
                    <span className="font-bold text-zinc-900 dark:text-white">{st.to}</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    {st.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Member Balances Breakdown */}
        <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800">
          <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">
            Individual Net Balances (&Sigma; NetBalance = ₹0.00)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {scenario.balances.map((b, idx) => (
              <div 
                key={idx}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 p-3 text-xs"
              >
                <div className="font-medium text-zinc-800 dark:text-zinc-200 truncate">{b.name}</div>
                <div className={`mt-1 font-mono font-bold ${
                  b.status === 'gets' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                }`}>
                  {b.amount}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
