export const PageHeader = ({ title, description, actions }) => (
  <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
    <div>
      <h1 className="text-2xl font-bold text-slate-950 dark:text-white">{title}</h1>
      {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);
