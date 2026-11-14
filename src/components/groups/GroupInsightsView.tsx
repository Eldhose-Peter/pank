'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  PieChart as PieIcon,
  BarChart3,
  Utensils,
  Car,
  Building2,
  ShoppingCart,
  Film,
  Zap,
  Tag,
  Award,
  Calendar,
  Plus,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertCircle,
  Flame,
} from 'lucide-react';
import { formatMinorUnits, getCurrencySymbol } from '@/lib/utils';
import { ShadowPulseDot } from '@/components/ui/ShadowLoader';
import type { GroupInsightsResult, CategoryBreakdown, ExpenseCategory } from '@/modules/insights/types';

interface GroupInsightsViewProps {
  groupId: string;
  currency: string;
  currentUserId: string;
  onAddExpense?: () => void;
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

export function GroupInsightsView({
  groupId,
  currency,
  currentUserId,
  onAddExpense,
}: GroupInsightsViewProps) {
  const [data, setData] = useState<GroupInsightsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<ExpenseCategory | null>(null);
  const [hoveredTimelineIndex, setHoveredTimelineIndex] = useState<number | null>(null);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/groups/${groupId}/insights`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to load group insights');
      }
      const json: GroupInsightsResult = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error fetching insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [groupId]);

  if (loading && !data) {
    return (
      <div className="mt-6 sm:mt-8 space-y-6">
        {/* Loading header */}
        <div className="flex items-center gap-3">
          <ShadowPulseDot variant="primary" />
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Analyzing group transactions & financial velocity...
          </span>
        </div>

        {/* Skeleton Stat Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-zinc-200/80 bg-white p-4 sm:p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="h-3 w-20 rounded skeleton-shimmer" />
              <div className="mt-3 h-7 w-28 rounded-lg skeleton-shimmer" />
              <div className="mt-2 h-3 w-36 rounded skeleton-shimmer" />
            </div>
          ))}
        </div>

        {/* Skeleton Visual Cards */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-72 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 skeleton-shimmer" />
          <div className="h-72 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 skeleton-shimmer" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6 sm:mt-8 rounded-2xl border border-rose-200 bg-rose-50/70 p-6 text-center dark:border-rose-900/60 dark:bg-rose-950/40">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
        <h3 className="mt-2 text-sm font-bold text-rose-900 dark:text-rose-200">
          Failed to load insights
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

  if (!data || data.expenseCount === 0) {
    return (
      <div className="mt-6 sm:mt-8 rounded-3xl border border-zinc-200/80 bg-white p-8 sm:p-14 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
          <BarChart3 className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-lg font-bold text-zinc-900 dark:text-white">
          No Spending Insights Yet
        </h3>
        <p className="mx-auto mt-1.5 max-w-md text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
          Log your first bill or shared trip expense to view instant category breakdowns, payer vs. consumer matrix, and spending velocity charts.
        </p>
        {onAddExpense && (
          <div className="mt-6">
            <button
              onClick={onAddExpense}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-500 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add First Expense</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // Visual Donut Slices Math
  const donutRadius = 54;
  const donutCircumference = 2 * Math.PI * donutRadius; // ~339.29
  let accumulatedPercent = 0;

  const validCategories = data.categoryBreakdown.filter((c) => c.totalAmount > 0);

  return (
    <div className="mt-6 sm:mt-8 space-y-6 sm:space-y-8">
      {/* 1. HERO STATS CARDS */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-4">
        {/* Card 1: Total Group Spend */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-3.5 sm:p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 transition-all">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider">Group Total</span>
            <TrendingUp className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-lg sm:text-2xl font-extrabold font-mono text-zinc-900 dark:text-white truncate">
            {formatMinorUnits(data.totalSpend, data.currency)}
          </div>
          <p className="mt-1 text-[10px] sm:text-[11px] text-zinc-400">
            Across {data.expenseCount} {data.expenseCount === 1 ? 'expense' : 'expenses'}
          </p>
        </div>

        {/* Card 2: Personal Consumption */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-3.5 sm:p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 transition-all">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider">Your Share</span>
            <ArrowDownRight className="h-4 w-4 text-violet-500" />
          </div>
          <div className="mt-2 text-lg sm:text-2xl font-extrabold font-mono text-violet-600 dark:text-violet-400 truncate">
            {formatMinorUnits(data.userSpend.totalOwed, data.currency)}
          </div>
          <p className="mt-1 text-[10px] sm:text-[11px] text-zinc-400">
            {data.userSpend.owedPercentage}% of group spend
          </p>
        </div>

        {/* Card 3: Upfront Paid by User */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-3.5 sm:p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 transition-all">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider">You Paid</span>
            <ArrowUpRight className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-lg sm:text-2xl font-extrabold font-mono text-indigo-600 dark:text-indigo-400 truncate">
            {formatMinorUnits(data.userSpend.totalPaid, data.currency)}
          </div>
          <p className="mt-1 text-[10px] sm:text-[11px] text-zinc-400">
            {data.userSpend.paidPercentage}% floated upfront
          </p>
        </div>

        {/* Card 4: Average Expense Size */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-3.5 sm:p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 transition-all">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider">Avg Expense</span>
            <PieIcon className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-lg sm:text-2xl font-extrabold font-mono text-zinc-900 dark:text-white truncate">
            {formatMinorUnits(data.averageExpenseSize, data.currency)}
          </div>
          <p className="mt-1 text-[10px] sm:text-[11px] text-zinc-400">Per recorded transaction</p>
        </div>
      </div>

      {/* 2. CATEGORY BREAKDOWN & SPENDING TIMELINE */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Category Donut & Distribution */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4.5 sm:p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <PieIcon className="h-4 w-4 text-indigo-500" />
                Category Distribution
              </h3>
              <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Zero-effort automated keyword categorization
              </p>
            </div>
            {data.highlights.topCategory && (
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/50">
                Top: {data.highlights.topCategory.label}
              </span>
            )}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center gap-6">
            {/* SVG Donut */}
            <div className="relative flex items-center justify-center shrink-0">
              <svg width="150" height="150" viewBox="0 0 140 140" className="transform -rotate-90">
                {/* Background Ring */}
                <circle
                  cx="70"
                  cy="70"
                  r={donutRadius}
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="14"
                  className="text-zinc-200 dark:text-zinc-800"
                />
                {/* Segment Slices */}
                {validCategories.map((item) => {
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
                      onClick={() =>
                        setActiveCategory(activeCategory === item.category ? null : item.category)
                      }
                    />
                  );
                })}
              </svg>

              {/* Center Donut Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Total
                </span>
                <span className="text-sm font-extrabold font-mono text-zinc-900 dark:text-white">
                  {getCurrencySymbol(data.currency)}
                  {Math.round(data.totalSpend / 100).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Category Ranked Progress List */}
            <div className="flex-1 w-full space-y-3">
              {validCategories.slice(0, 5).map((item) => {
                const IconComponent = CATEGORY_ICONS[item.category] || Tag;
                const isHovered = activeCategory === item.category;
                const colorConfig = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.general;

                return (
                  <div
                    key={item.category}
                    onClick={() =>
                      setActiveCategory(activeCategory === item.category ? null : item.category)
                    }
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
                          {formatMinorUnits(item.totalAmount, data.currency)}
                        </span>
                        <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 font-mono w-9 text-right">
                          {item.percentage}%
                        </span>
                      </div>
                    </div>
                    {/* Segment Progress Bar */}
                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-zinc-200/80 dark:bg-zinc-800 overflow-hidden">
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
        </div>

        {/* Spending Velocity Timeline */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4.5 sm:p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-purple-500" />
                  Daily Spending Velocity
                </h3>
                <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Trip spending pace across logged days
                </p>
              </div>
              {data.highlights.peakDay && (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/50 flex items-center gap-1">
                  <Flame className="h-3 w-3 text-amber-500" />
                  Peak: {data.highlights.peakDay.date}
                </span>
              )}
            </div>

            {/* Responsive Native SVG Bar Chart */}
            <div className="mt-6 w-full">
              {data.spendingTimeline.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-400">No dates recorded yet.</div>
              ) : (
                (() => {
                  const timeline = data.spendingTimeline;
                  const maxDayAmount = Math.max(...timeline.map((t) => t.totalAmount), 1);
                  const chartHeight = 120;
                  const isMobileCompact = timeline.length <= 12;
                  const chartWidth = isMobileCompact ? 360 : Math.max(timeline.length * 42, 280);

                  return (
                    <div className={isMobileCompact ? "w-full pb-2" : "overflow-x-auto no-scrollbar pb-2"}>
                      <svg
                        width={isMobileCompact ? "100%" : chartWidth}
                        height={chartHeight + 35}
                        className={isMobileCompact ? "w-full h-auto max-h-[160px] mx-auto block" : "mx-auto block"}
                        viewBox={`0 0 ${chartWidth} ${chartHeight + 35}`}
                      >
                        {/* Horizontal Guides */}
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
                              className="text-zinc-200 dark:text-zinc-800"
                            />
                          );
                        })}

                        {/* Bars */}
                        {timeline.map((point, idx) => {
                          const barWidth = Math.min(24, Math.floor((chartWidth / timeline.length) * 0.65));
                          const slotWidth = chartWidth / timeline.length;
                          const x = idx * slotWidth + (slotWidth - barWidth) / 2;
                          const barHeight = Math.max(6, (point.totalAmount / maxDayAmount) * chartHeight);
                          const y = chartHeight - barHeight;
                          const isHovered = hoveredTimelineIndex === idx;
                          const isPeak = data.highlights.peakDay?.date === point.date;

                          return (
                            <g
                              key={point.date}
                              className="cursor-pointer transition-all"
                              onClick={() =>
                                setHoveredTimelineIndex(hoveredTimelineIndex === idx ? null : idx)
                              }
                              onMouseEnter={() => setHoveredTimelineIndex(idx)}
                              onMouseLeave={() => setHoveredTimelineIndex(null)}
                            >
                              {/* Hover / Tap Highlight Area */}
                              <rect
                                x={idx * slotWidth}
                                y="0"
                                width={slotWidth}
                                height={chartHeight + 30}
                                fill="transparent"
                                className="hover:fill-zinc-500/5 dark:hover:fill-zinc-400/5"
                              />

                              {/* Bar */}
                              <rect
                                x={x}
                                y={y}
                                width={barWidth}
                                height={barHeight}
                                rx="4"
                                className={`transition-all duration-200 ${
                                  isPeak
                                    ? 'fill-amber-500 dark:fill-amber-400'
                                    : isHovered
                                    ? 'fill-indigo-500 dark:fill-indigo-400'
                                    : 'fill-indigo-400/80 dark:fill-indigo-600'
                                }`}
                              />

                              {/* Date Text */}
                              <text
                                x={x + barWidth / 2}
                                y={chartHeight + 16}
                                textAnchor="middle"
                                className="text-[10px] fill-zinc-500 dark:fill-zinc-400 font-mono"
                              >
                                {point.date.slice(5)}
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

          {/* Active Hover / Peak Tooltip Summary */}
          <div className="mt-3 rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-3.5 py-2.5 dark:border-zinc-800 dark:bg-zinc-800/40 flex items-center justify-between text-xs">
            {hoveredTimelineIndex !== null && data.spendingTimeline[hoveredTimelineIndex] ? (
              (() => {
                const pt = data.spendingTimeline[hoveredTimelineIndex];
                return (
                  <>
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      📅 {pt.date} ({pt.expenseCount} {pt.expenseCount === 1 ? 'bill' : 'bills'})
                    </span>
                    <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400">
                      {formatMinorUnits(pt.totalAmount, data.currency)}
                    </span>
                  </>
                );
              })()
            ) : data.highlights.peakDay ? (
              <>
                <span className="text-zinc-500 dark:text-zinc-400">
                  Peak Day: <strong className="text-zinc-800 dark:text-zinc-200">{data.highlights.peakDay.date}</strong>
                </span>
                <span className="font-bold font-mono text-zinc-900 dark:text-white">
                  {formatMinorUnits(data.highlights.peakDay.amount, data.currency)}
                </span>
              </>
            ) : (
              <span className="text-zinc-500 dark:text-zinc-400">Hover over bars to inspect daily spend totals</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. BILATERAL PAYER VS. CONSUMER MATRIX */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-4.5 sm:p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-zinc-200/80 dark:border-zinc-800 pb-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Award className="h-4 w-4 text-indigo-500" />
              Member Financing vs. Consumption Matrix
            </h3>
            <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Who paid upfront for the group vs. who actually consumed the benefits
            </p>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 shrink-0">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
              Paid Upfront
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
              Consumed (Owed)
            </span>
          </div>
        </div>

        <div className="mt-4 divide-y divide-zinc-200/80 dark:divide-zinc-800 space-y-4">
          {data.memberMatrix.map((member) => {
            const isCurrentUser = member.userId === currentUserId;

            return (
              <div key={member.memberId} className="pt-3 first:pt-0">
                <div className="flex items-center justify-between">
                  {/* Member Name & Badges */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
                      {member.displayName}
                    </span>
                    {isCurrentUser && (
                      <span className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 dark:text-zinc-300">
                        You
                      </span>
                    )}
                    {member.isPayerHero && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/80 px-2 py-0.5 text-[10px] font-extrabold text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 shadow-2xs">
                        👑 Payer Hero
                      </span>
                    )}
                  </div>

                  {/* Net Balance Status */}
                  <div>
                    {member.netBalance > 0 ? (
                      <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        Gets back {formatMinorUnits(member.netBalance, data.currency)}
                      </span>
                    ) : member.netBalance < 0 ? (
                      <span className="text-xs font-bold font-mono text-rose-600 dark:text-rose-400">
                        Owes {formatMinorUnits(Math.abs(member.netBalance), data.currency)}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-zinc-400">
                        Settled ({formatMinorUnits(0, data.currency)})
                      </span>
                    )}
                  </div>
                </div>

                {/* Dual Horizontal Segmented Progress Bars */}
                <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {/* Paid Bar */}
                  <div className="rounded-xl bg-zinc-50 p-2 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
                    <div className="flex justify-between text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                      <span>Paid Upfront:</span>
                      <strong className="font-mono text-indigo-600 dark:text-indigo-400">
                        {formatMinorUnits(member.totalPaid, data.currency)} ({member.paidPercentage}%)
                      </strong>
                    </div>
                    <div className="mt-1 h-2 w-full rounded-full bg-zinc-200/70 dark:bg-zinc-700 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, member.paidPercentage)}%` }}
                      />
                    </div>
                  </div>

                  {/* Consumed Bar */}
                  <div className="rounded-xl bg-zinc-50 p-2 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
                    <div className="flex justify-between text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                      <span>Consumed:</span>
                      <strong className="font-mono text-violet-600 dark:text-violet-400">
                        {formatMinorUnits(member.totalOwed, data.currency)} ({member.owedPercentage}%)
                      </strong>
                    </div>
                    <div className="mt-1 h-2 w-full rounded-full bg-zinc-200/70 dark:bg-zinc-700 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-violet-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, member.owedPercentage)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. SMART HIGHLIGHTS & RECORDS */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {/* Highlight 1: Largest Single Expense */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Largest Bill</span>
          </div>
          {data.highlights.largestExpense ? (
            <div className="mt-2.5">
              <div className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white truncate">
                {data.highlights.largestExpense.title}
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-extrabold font-mono text-zinc-900 dark:text-white">
                  {formatMinorUnits(data.highlights.largestExpense.amount, data.currency)}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">paid by {data.highlights.largestExpense.paidBy}</span>
              </div>
            </div>
          ) : (
            <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">No expenses recorded</div>
          )}
        </div>

        {/* Highlight 2: Top Upfront Financier */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            <Award className="h-3.5 w-3.5 text-indigo-500" />
            <span>Trip Financier</span>
          </div>
          {data.highlights.topPayer ? (
            <div className="mt-2.5">
              <div className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white truncate">
                {data.highlights.topPayer.displayName}
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-extrabold font-mono text-indigo-600 dark:text-indigo-400">
                  {formatMinorUnits(data.highlights.topPayer.amount, data.currency)}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">({data.highlights.topPayer.percentage}% of total)</span>
              </div>
            </div>
          ) : (
            <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">No payments logged</div>
          )}
        </div>

        {/* Highlight 3: Settlement Status Ratio */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>Settlement Health</span>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-extrabold font-mono text-zinc-900 dark:text-white">
                {data.highlights.settledRatio}%
              </span>
              <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                {formatMinorUnits(data.highlights.settledAmount, data.currency)} settled
              </span>
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-2 w-full rounded-full bg-zinc-200/80 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${data.highlights.settledRatio}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
