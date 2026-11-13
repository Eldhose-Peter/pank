export function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200/80 pb-6 dark:border-zinc-800">
        <div>
          <div className="h-8 w-56 rounded-xl skeleton-shimmer shadow-xs" />
          <div className="mt-2.5 h-4 w-96 max-w-full rounded skeleton-shimmer" />
        </div>
        <div className="h-10 w-44 rounded-xl skeleton-shimmer shadow-sm" />
      </div>

      {/* Metric Cards skeleton with elevated soft shadows */}
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-zinc-200/70 bg-white p-6 shadow-sm shadow-zinc-200/50 dark:border-zinc-800/80 dark:bg-zinc-900 dark:shadow-none"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 rounded skeleton-shimmer" />
              <div className="h-5 w-5 rounded-lg skeleton-shimmer" />
            </div>
            <div className="mt-4 h-8 w-20 rounded-lg skeleton-shimmer shadow-xs" />
            <div className="mt-2.5 h-3 w-36 rounded skeleton-shimmer" />
          </div>
        ))}
      </div>

      {/* Groups List skeleton */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-5">
          <div className="h-6 w-36 rounded-lg skeleton-shimmer shadow-xs" />
          <div className="h-4 w-16 rounded skeleton-shimmer" />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-zinc-200/70 bg-white p-6 shadow-sm shadow-zinc-200/40 dark:border-zinc-800/80 dark:bg-zinc-900 dark:shadow-none"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="h-11 w-11 rounded-xl skeleton-shimmer shadow-xs" />
                  <div className="space-y-2">
                    <div className="h-4 w-32 rounded skeleton-shimmer" />
                    <div className="h-3 w-48 rounded skeleton-shimmer" />
                  </div>
                </div>
                <div className="h-5 w-12 rounded-md skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
