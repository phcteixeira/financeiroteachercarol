/** Blocos de esqueleto exibidos enquanto as páginas carregam. */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-md bg-slate-200 ${className}`} />;
}

/** Envolve um esqueleto com texto acessível para leitores de tela. */
export function LoadingRegion({ label = "Carregando...", children }: { label?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function SkeletonHeader({ actions = 1, subtitle = true }: { actions?: number; subtitle?: boolean }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        {subtitle && <Skeleton className="h-4 w-32" />}
      </div>
      <div className="flex gap-2">
        {Array.from({ length: actions }, (_, i) => (
          <Skeleton key={i} className="h-9 w-32" />
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 6, cols = 5, card = true }: { rows?: number; cols?: number; card?: boolean }) {
  const table = (
    <div className="w-full">
      <div className="flex gap-4 border-b border-slate-200 px-3 py-3">
        {Array.from({ length: cols }, (_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-slate-100 px-3 py-3">
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} className={`h-4 flex-1 ${c === 0 ? "max-w-56" : ""}`} />
          ))}
        </div>
      ))}
    </div>
  );
  return card ? <div className="card overflow-hidden p-0">{table}</div> : table;
}

export function SkeletonCard({ lines = 3, title = true }: { lines?: number; title?: boolean }) {
  return (
    <div className="card space-y-3">
      {title && <Skeleton className="h-5 w-40" />}
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={`h-4 ${i === lines - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

export function SkeletonForm({ fields = 6, columns = 2 }: { fields?: number; columns?: 1 | 2 }) {
  return (
    <div className={`grid gap-4 ${columns === 2 ? "sm:grid-cols-2" : ""}`}>
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
      <div className={`flex justify-end ${columns === 2 ? "sm:col-span-2" : ""}`}>
        <Skeleton className="h-9 w-28" />
      </div>
    </div>
  );
}

export function SkeletonFilters({ fields = 2 }: { fields?: number }) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {Array.from({ length: fields }, (_, i) => (
        <Skeleton key={i} className="h-9 w-48" />
      ))}
      <Skeleton className="h-9 w-20" />
    </div>
  );
}
