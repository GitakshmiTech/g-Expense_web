export const LoadingSkeleton = ({ rows = 5, cards = 0 }) => (
  <div className="space-y-5">
    {cards > 0 && (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: cards }).map((_, index) => <div key={index} className="panel h-32 animate-pulse" />)}
      </div>
    )}
    <div className="panel p-4">
      <div className="mb-4 h-5 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, index) => <div key={index} className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}
      </div>
    </div>
  </div>
);
