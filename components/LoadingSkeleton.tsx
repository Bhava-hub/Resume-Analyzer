function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-9 w-9 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-5 w-36 animate-pulse rounded bg-gray-200" />
      </div>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
            <div className="h-3.5 w-4/5 animate-pulse rounded bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
        Analyzing your resume…
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
