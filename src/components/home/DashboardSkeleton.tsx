export function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <div>
          <div className="h-8 w-52 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
          <div className="mt-2 h-4 w-80 max-w-full rounded bg-zinc-100 dark:bg-zinc-800" />
        </div>
        <div className="h-10 w-36 rounded-xl bg-zinc-200 dark:bg-zinc-850" />
      </div>

      {/* Metric Cards skeleton */}
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-3 h-8 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-2 h-3 w-32 rounded bg-zinc-100 dark:bg-zinc-800" />
          </div>
        ))}
      </div>

      {/* Groups List skeleton */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-4 w-12 rounded bg-zinc-100 dark:bg-zinc-800" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
                  <div>
                    <div className="h-4 w-28 rounded bg-zinc-200 dark:bg-zinc-800" />
                    <div className="mt-2 h-3 w-40 rounded bg-zinc-100 dark:bg-zinc-800" />
                  </div>
                </div>
                <div className="h-5 w-10 rounded bg-zinc-100 dark:bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
