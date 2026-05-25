export const PageHeader = ({ title, description, actions }) => (
  <div className="sticky top-20 z-10 -mx-[10px] -mt-[10px] mb-5 px-6 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-[#f4f6f9]/95 dark:bg-[#0b1220]/95 backdrop-blur border-b border-slate-200/60 dark:border-slate-800/60">
    <div>
      <h1 className="text-2xl font-bold text-slate-950 dark:text-white">{title}</h1>
      {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);
