'use client';

import React, { useState, useEffect } from 'react';
import {
  PieChart as PieIcon,
  BarChart3,
  TrendingUp,
  Sparkles,
  Utensils,
  Car,
  Building2,
  ShoppingCart,
  Film,
  Zap,
  Tag,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  CreditCard,
  RefreshCw,
  AlertCircle,
  Plus,
  Handshake,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { formatMinorUnits, getCurrencySymbol } from '@/lib/utils';
import { ShadowPulseDot } from '@/components/ui/ShadowLoader';
import type { OverallInsightsResult, ExpenseCategory, TopPartnerItem } from '@/modules/insights/types';

interface UserInsightsViewProps {
  user: {
    id: string;
    fullName: string;
    email: string;
  };
  onCreateGroup?: () => void;
}

const CATEGORY_ICONS: Record<ExpenseCategory, React.ComponentType<{ className?: string }>> = {
  food_dining: Utensils,
  transport: Car,
  accommodation: Building2,
  groceries: ShoppingCart,
  entertainment: Film,
  utilities: Zap,
  general: Tag,
};

const CATEGORY_COLORS: Record<ExpenseCategory, { hex: string; bg: string; text: string }> = {
  food_dining: { hex: '#f59e0b', bg: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  transport: { hex: '#3b82f6', bg: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
  accommodation: { hex: '#6366f1', bg: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400' },
  groceries: { hex: '#10b981', bg: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  entertainment: { hex: '#a855f7', bg: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400' },
  utilities: { hex: '#f43f5e', bg: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400' },
  general: { hex: '#71717a', bg: 'bg-zinc-500', text: 'text-zinc-600 dark:text-zinc-400' },
};

export function UserInsightsView({ user, onCreateGroup }: UserInsightsViewProps) {
  const [data, setData] = useState<OverallInsightsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('INR');
  const [activeCategory, setActiveCategory] = useState<ExpenseCategory | null>(null);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/insights');
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to load spending insights');
      }
      const json: OverallInsightsResult = await res.json();
      setData(json);
      if (json.currencies.length > 0) {
        setSelectedCurrency(json.currencies[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading overall insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  if (loading && !data) {
    return (
      <div className="mt-8 space-y-6">
        <div className="flex items-center gap-3">
          <ShadowPulseDot variant="primary" />
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Synthesizing cross-group financial data & spending trends...
          </span>
        </div>

        {/* Skeleton AI Brief */}
        <div className="h-24 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 skeleton-shimmer" />

        {/* Skeleton Stat Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="h-3 w-20 rounded skeleton-shimmer" />
              <div className="mt-3 h-7 w-28 rounded-lg skeleton-shimmer" />
              <div className="mt-2 h-3 w-36 rounded skeleton-shimmer" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50/70 p-6 text-center dark:border-rose-900/60 dark:bg-rose-950/40">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
        <h3 className="mt-2 text-sm font-bold text-rose-900 dark:text-rose-200">
          Failed to load spending insights
        </h3>
        <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>
        <button
          onClick={fetchInsights}
          className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-500 active:scale-95 transition-all cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  if (!data || data.totalExpenseCount === 0) {
    return (
      <div className="mt-8 rounded-3xl border border-zinc-200/80 bg-white p-8 sm:p-14 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
          <BarChart3 className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-lg font-bold text-zinc-900 dark:text-white">
          No Spending Activity Across Groups
        </h3>
        <p className="mx-auto mt-1.5 max-w-md text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
          You don't have any logged expenses or mutual group splits yet. Once you join a group and record expenses, your global budget insights will appear here automatically.
        </p>
        {onCreateGroup && (
          <div className="mt-6">
            <button
              onClick={onCreateGroup}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-500 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Create an Expense Group</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  const activeCurrencyTotals = data.totalsByCurrency[selectedCurrency] || {
    currency: selectedCurrency,
    totalOutofPocketOwed: 0,
    totalPaidUpfront: 0,
    totalReimbursed: 0,
    totalSettledPaid: 0,
    netBalance: 0,
  };

  const activeCategories = (data.categoriesByCurrency[selectedCurrency] || []).filter(
    (c) => c.totalAmount > 0
  );

  // Donut Math
  const donutRadius = 54;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let accumulatedPercent = 0;

  return (
    <div className="mt-8 space-y-6 sm:space-y-8">
      {/* 1. AI EXECUTIVE SPENDING BRIEF */}
      <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/90 via-purple-50/60 to-white p-5 sm:p-6 dark:border-indigo-900/60 dark:bg-gradient-to-r dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-zinc-900 shadow-sm shadow-indigo-500/5">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/20">
            <Sparkles className="h-5 w-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                AI Financial Briefing
              </h3>
              <span className="rounded-full bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                Gemini Synthesized
              </span>
            </div>
            <p className="mt-1.5 text-xs sm:text-sm text-zinc-700 dark:text-zinc-200 leading-relaxed font-medium">
              {data.aiSpendingBrief}
            </p>
          </div>
        </div>
      </div>

      {/* 2. MULTI-CURRENCY SEGMENTED SELECTOR (Exact Accounting Guarantee) */}
      {data.currencies.length > 1 && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Accounting by Currency:
          </div>
          <div className="inline-flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
            {data.currencies.map((curr) => (
              <button
                key={curr}
                onClick={() => setSelectedCurrency(curr)}
                className={`min-h-[40px] rounded-lg px-4 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  selectedCurrency === curr
                    ? 'bg-white text-indigo-600 shadow-xs dark:bg-zinc-900 dark:text-white'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                {getCurrencySymbol(curr)} {curr}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. FOUR CORE PERSONAL FINANCE CARDS */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-4">
        {/* Out-of-pocket consumption */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-3.5 sm:p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 transition-all">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider">
              True Spend
            </span>
            <ArrowDownRight className="h-4 w-4 text-violet-500" />
          </div>
          <div className="mt-2 text-lg sm:text-2xl font-extrabold font-mono text-zinc-900 dark:text-white truncate">
            {formatMinorUnits(activeCurrencyTotals.totalOutofPocketOwed, selectedCurrency)}
          </div>
          <p className="mt-1 text-[10px] sm:text-[11px] text-zinc-400 truncate">
            Your out-of-pocket share
          </p>
        </div>

        {/* Upfront money floated */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-3.5 sm:p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 transition-all">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider">
              Floated Upfront
            </span>
            <ArrowUpRight className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-lg sm:text-2xl font-extrabold font-mono text-indigo-600 dark:text-indigo-400 truncate">
            {formatMinorUnits(activeCurrencyTotals.totalPaidUpfront, selectedCurrency)}
          </div>
          <p className="mt-1 text-[10px] sm:text-[11px] text-zinc-400 truncate">
            Paid on behalf of groups
          </p>
        </div>

        {/* Reimbursed Received */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-3.5 sm:p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 transition-all">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider">
              Reimbursed
            </span>
            <Handshake className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-lg sm:text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 truncate">
            {formatMinorUnits(activeCurrencyTotals.totalReimbursed, selectedCurrency)}
          </div>
          <p className="mt-1 text-[10px] sm:text-[11px] text-zinc-400 truncate">
            Received from settlements
          </p>
        </div>

        {/* Net Cross-Group Balance */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-3.5 sm:p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 transition-all">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider">
              Net Standing
            </span>
            <CreditCard className="h-4 w-4 text-zinc-500" />
          </div>
          <div
            className={`mt-2 text-lg sm:text-2xl font-extrabold font-mono truncate ${
              activeCurrencyTotals.netBalance > 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : activeCurrencyTotals.netBalance < 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-zinc-700 dark:text-zinc-300'
            }`}
          >
            {formatMinorUnits(activeCurrencyTotals.netBalance, selectedCurrency)}
          </div>
          <p className="mt-1 text-[10px] sm:text-[11px] text-zinc-400 truncate">
            {activeCurrencyTotals.netBalance > 0
              ? 'You are owed back'
              : activeCurrencyTotals.netBalance < 0
              ? 'You currently owe'
              : 'All settled up'}
          </p>
        </div>
      </div>

      {/* 4. GLOBAL CATEGORY BREAKDOWN & MONTHLY VELOCITY */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Global Category Distribution */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4.5 sm:p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <PieIcon className="h-4 w-4 text-indigo-500" />
                Where Your Money Goes
              </h3>
              <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Personal out-of-pocket consumption breakdown in {selectedCurrency}
              </p>
            </div>
          </div>

          {activeCategories.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-400">
              No consumption categorized in {selectedCurrency}.
            </div>
          ) : (
            <div className="mt-6 flex flex-col sm:flex-row items-center gap-6">
              {/* SVG Donut */}
              <div className="relative flex items-center justify-center shrink-0">
                <svg width="150" height="150" viewBox="0 0 140 140" className="transform -rotate-90">
                  <circle
                    cx="70"
                    cy="70"
                    r={donutRadius}
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="14"
                    className="text-zinc-100 dark:text-zinc-800"
                  />
                  {activeCategories.map((item) => {
                    const strokeDasharray = `${(item.percentage / 100) * donutCircumference} ${donutCircumference}`;
                    const strokeDashoffset = -((accumulatedPercent / 100) * donutCircumference);
                    accumulatedPercent += item.percentage;
                    const colorConfig = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.general;
                    const isHovered = activeCategory === item.category;

                    return (
                      <circle
                        key={item.category}
                        cx="70"
                        cy="70"
                        r={donutRadius}
                        fill="transparent"
                        stroke={colorConfig.hex}
                        strokeWidth={isHovered ? '18' : '14'}
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-300 cursor-pointer"
                        onMouseEnter={() => setActiveCategory(item.category)}
                        onMouseLeave={() => setActiveCategory(null)}
                      />
                    );
                  })}
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Spent
                  </span>
                  <span className="text-sm font-extrabold font-mono text-zinc-900 dark:text-white">
                    {getCurrencySymbol(selectedCurrency)}
                    {Math.round(activeCurrencyTotals.totalOutofPocketOwed / 100).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Category Ranked Progress List */}
              <div className="flex-1 w-full space-y-3">
                {activeCategories.slice(0, 5).map((item) => {
                  const IconComponent = CATEGORY_ICONS[item.category] || Tag;
                  const isHovered = activeCategory === item.category;
                  const colorConfig = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.general;

                  return (
                    <div
                      key={item.category}
                      onMouseEnter={() => setActiveCategory(item.category)}
                      onMouseLeave={() => setActiveCategory(null)}
                      className={`rounded-xl p-2 transition-all cursor-pointer ${
                        isHovered
                          ? 'bg-zinc-100/80 dark:bg-zinc-800/80 ring-1 ring-zinc-300 dark:ring-zinc-700'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <div
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-white"
                            style={{ backgroundColor: colorConfig.hex }}
                          >
                            <IconComponent className="h-3.5 w-3.5" />
                          </div>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                            {item.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-xs font-bold text-zinc-900 dark:text-white">
                            {formatMinorUnits(item.totalAmount, selectedCurrency)}
                          </span>
                          <span className="text-[10px] font-semibold text-zinc-400 font-mono w-9 text-right">
                            {item.percentage}%
                          </span>
                        </div>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${item.percentage}%`,
                            backgroundColor: colorConfig.hex,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Monthly Spending Velocity Bars */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4.5 sm:p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-purple-500" />
                  Monthly Out-of-Pocket Velocity
                </h3>
                <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Month-over-month consumption pace in {selectedCurrency}
                </p>
              </div>
            </div>

            <div className="mt-6 w-full">
              {data.monthlyTrends.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-400">
                  No monthly activity recorded yet.
                </div>
              ) : (
                (() => {
                  const trends = data.monthlyTrends;
                  const maxMonthVal = Math.max(
                    ...trends.map((t) => t.byCurrency[selectedCurrency] || 0),
                    1
                  );
                  const chartHeight = 120;
                  const chartWidth = Math.max(trends.length * 56, 280);

                  return (
                    <div className="overflow-x-auto no-scrollbar pb-2">
                      <svg
                        width={chartWidth}
                        height={chartHeight + 35}
                        className="mx-auto block"
                        viewBox={`0 0 ${chartWidth} ${chartHeight + 35}`}
                      >
                        {[0.25, 0.5, 0.75, 1.0].map((ratio) => {
                          const y = chartHeight - chartHeight * ratio;
                          return (
                            <line
                              key={ratio}
                              x1="0"
                              y1={y}
                              x2={chartWidth}
                              y2={y}
                              stroke="currentColor"
                              strokeDasharray="2 3"
                              className="text-zinc-100 dark:text-zinc-800"
                            />
                          );
                        })}

                        {trends.map((trend, idx) => {
                          const val = trend.byCurrency[selectedCurrency] || 0;
                          const slotWidth = chartWidth / trends.length;
                          const barWidth = Math.min(28, Math.floor(slotWidth * 0.55));
                          const x = idx * slotWidth + (slotWidth - barWidth) / 2;
                          const barHeight = Math.max(6, (val / maxMonthVal) * chartHeight);
                          const y = chartHeight - barHeight;

                          return (
                            <g key={trend.month} className="cursor-pointer">
                              <rect
                                x={x}
                                y={y}
                                width={barWidth}
                                height={barHeight}
                                rx="4"
                                className="fill-purple-500 dark:fill-purple-400 hover:fill-purple-400 transition-colors"
                              />
                              <text
                                x={x + barWidth / 2}
                                y={chartHeight + 16}
                                textAnchor="middle"
                                className="text-[10px] fill-zinc-400 dark:fill-zinc-500 font-mono"
                              >
                                {trend.label.split(' ')[0]}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  );
                })()
              )}
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-zinc-100 bg-zinc-50/80 px-3.5 py-2.5 dark:border-zinc-800 dark:bg-zinc-800/40 text-xs text-zinc-500 flex items-center justify-between">
            <span>Tracking true personal living expenses vs. shared funding</span>
            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
          </div>
        </div>
      </div>

      {/* 5. FREQUENT CO-SPENDERS / TOP SPLIT PARTNERS */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-4.5 sm:p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-500" />
              Frequent Split Partners
            </h3>
            <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              People you share expenses with most often across all mutual groups
            </p>
          </div>
        </div>

        {data.topPartners.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-400">
            No mutual split partners found yet.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.topPartners.map((partner) => (
              <div
                key={partner.memberId}
                className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50/60 p-3.5 dark:border-zinc-800 dark:bg-zinc-800/40"
              >
                <div className="flex items-center gap-3 truncate">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 font-bold text-xs dark:bg-indigo-950 dark:text-indigo-300 shadow-2xs">
                    {partner.displayName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <div className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white truncate">
                      {partner.displayName}
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      {partner.mutualExpenseCount}{' '}
                      {partner.mutualExpenseCount === 1 ? 'shared bill' : 'shared bills'} •{' '}
                      {partner.groupCount} {partner.groupCount === 1 ? 'group' : 'groups'}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 pl-2">
                  {partner.netBalance > 0 ? (
                    <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      +{formatMinorUnits(partner.netBalance, partner.currency)}
                    </span>
                  ) : partner.netBalance < 0 ? (
                    <span className="text-xs font-bold font-mono text-rose-600 dark:text-rose-400">
                      -{formatMinorUnits(Math.abs(partner.netBalance), partner.currency)}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-zinc-400">Settled</span>
                  )}
                  <span className="block text-[10px] text-zinc-400">
                    {partner.netBalance > 0 ? 'owes you' : partner.netBalance < 0 ? 'you owe' : 'net balance'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
