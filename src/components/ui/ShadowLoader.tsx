'use client';

import React from 'react';

export function ShadowPulseDot({
  className = '',
  variant = 'white',
}: {
  className?: string;
  variant?: 'white' | 'primary' | 'emerald';
}) {
  const isWhite = variant === 'white';
  const isEmerald = variant === 'emerald';

  return (
    <span className={`relative inline-flex items-center justify-center ${className}`}>
      <span
        className={`absolute inline-flex h-2.5 w-2.5 rounded-full opacity-75 animate-ping ${
          isWhite ? 'bg-indigo-300' : isEmerald ? 'bg-emerald-400' : 'bg-indigo-400'
        }`}
      />
      <span
        className={`relative inline-flex h-2 w-2 rounded-full ${
          isWhite
            ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.95)]'
            : isEmerald
            ? 'bg-emerald-600 dark:bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]'
            : 'bg-indigo-600 dark:bg-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.8)]'
        }`}
      />
    </span>
  );
}

export function GroupDetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back link placeholder */}
      <div className="h-4 w-28 rounded-lg skeleton-shimmer shadow-xs" />

      {/* Group Header Skeleton */}
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200/80 pb-6 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-60 rounded-xl skeleton-shimmer shadow-xs" />
            <div className="h-6 w-14 rounded-lg skeleton-shimmer shadow-xs" />
          </div>
          <div className="mt-2 h-4 w-72 rounded skeleton-shimmer" />
        </div>

        {/* Action buttons skeleton */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="h-9 w-24 rounded-xl skeleton-shimmer shadow-xs" />
          <div className="h-9 w-24 rounded-xl skeleton-shimmer shadow-xs" />
          <div className="h-9 w-20 rounded-xl skeleton-shimmer shadow-xs" />
          <div className="h-9 w-28 rounded-xl skeleton-shimmer shadow-sm" />
        </div>
      </div>

      {/* Metric Highlights Skeleton with elevated soft shadows */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-zinc-200/70 bg-white p-5 shadow-sm shadow-zinc-200/50 dark:border-zinc-800/80 dark:bg-zinc-900 dark:shadow-none"
          >
            <div className="h-3.5 w-24 rounded skeleton-shimmer" />
            <div className="mt-3 h-7 w-32 rounded-lg skeleton-shimmer shadow-xs" />
          </div>
        ))}
      </div>

      {/* Tab Navigation Skeleton */}
      <div className="mt-8 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex gap-8 pb-3">
          <div className="h-5 w-24 rounded skeleton-shimmer" />
          <div className="h-5 w-32 rounded skeleton-shimmer" />
          <div className="h-5 w-28 rounded skeleton-shimmer" />
          <div className="h-5 w-20 rounded skeleton-shimmer" />
        </div>
      </div>

      {/* Content Skeleton: Elevated items */}
      <div className="mt-6 space-y-3.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-zinc-200/70 bg-white p-5 shadow-sm shadow-zinc-200/40 dark:border-zinc-800/80 dark:bg-zinc-900 dark:shadow-none"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-xl skeleton-shimmer shadow-xs" />
                <div className="space-y-2">
                  <div className="h-4 w-40 rounded skeleton-shimmer" />
                  <div className="h-3 w-56 rounded skeleton-shimmer" />
                </div>
              </div>
              <div className="h-6 w-24 rounded-lg skeleton-shimmer shadow-xs" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AuthSkeleton() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-xl shadow-zinc-200/60 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-2xl skeleton-shimmer shadow-sm" />
          <div className="h-7 w-44 rounded-xl skeleton-shimmer" />
          <div className="h-4 w-52 rounded skeleton-shimmer" />
        </div>
        <div className="h-11 w-full rounded-xl skeleton-shimmer shadow-xs" />
        <div className="space-y-4 pt-2">
          <div className="h-10 w-full rounded-xl skeleton-shimmer" />
          <div className="h-10 w-full rounded-xl skeleton-shimmer" />
          <div className="h-11 w-full rounded-xl skeleton-shimmer shadow-sm" />
        </div>
      </div>
    </div>
  );
}
