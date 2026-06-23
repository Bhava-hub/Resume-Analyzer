export default function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
        <div className="flex items-center gap-3">
          <svg className="h-5 w-5 animate-spin text-primary shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm font-semibold text-primary" style={{ fontFamily: 'Literata, serif' }}>
            Analyzing your resume against the job description…
          </p>
        </div>
        <p className="mt-2 text-xs text-on-surface-variant pl-8">This usually takes 10–20 seconds.</p>
      </div>

      {/* Skeleton cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse rounded-xl border border-outline-variant/20 bg-surface-container overflow-hidden shadow-sm">
            <div className="h-12 bg-surface-container-high" />
            <div className="space-y-3 p-4">
              {[1, 2, 3].map((j) => (
                <div key={j} className="flex gap-2">
                  <div className="h-4 w-4 shrink-0 rounded-full bg-surface-container-high mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-4/5 rounded bg-surface-container-high" />
                    <div className="h-2.5 w-full rounded bg-surface-container-highest/40" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
