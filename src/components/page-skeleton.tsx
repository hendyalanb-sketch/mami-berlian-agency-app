export function PageSkeleton({ cards = 3 }: { cards?: number }) {
  return <div className="space-y-5" role="status" aria-label="Memuat halaman">
    <div className="space-y-2"><div className="h-7 w-48 animate-pulse rounded-lg bg-slate-200" /><div className="h-4 w-72 max-w-full animate-pulse rounded bg-slate-100" /></div>
    {Array.from({ length: cards }, (_, index) => <div key={index} className="h-32 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-slate-100" />)}
  </div>;
}
