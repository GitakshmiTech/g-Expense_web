import { SlidersHorizontal, Search } from 'lucide-react';

export const FilterBar = ({ search, onSearch, status, onStatus, statuses = [], rightSlot, pageSize, onPageSizeChange }) => (
  <div className="surface mb-5 flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between">
    <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input className="input pl-9" value={search || ''} onChange={(event) => onSearch?.(event.target.value)} placeholder="Search expenses, merchants, reports, employees" />
      </div>
      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <select className="input w-36 text-sm" value={pageSize || 10} onChange={(event) => onPageSizeChange?.(Number(event.target.value))}>
            <option value={5}>5 records</option>
            <option value={10}>10 records</option>
            <option value={20}>20 records</option>
            <option value={50}>50 records</option>
            <option value={100}>100 records</option>
          </select>
        )}
        <select className="input w-44" value={status || ''} onChange={(event) => onStatus?.(event.target.value)}>
          <option value="">All statuses</option>
          {statuses.map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}
        </select>
      </div>
    </div>
    {rightSlot && <div className="flex items-center gap-2">{rightSlot}</div>}
  </div>
);
