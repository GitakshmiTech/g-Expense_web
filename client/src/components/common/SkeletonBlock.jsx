export const SkeletonBlock = ({ rows = 4 }) => (
  <div className="panel rounded-lg p-4">
    <div className="mb-4 h-5 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-10 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      ))}
    </div>
  </div>
);
