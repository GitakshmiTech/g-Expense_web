import { Inbox } from 'lucide-react';

export const EmptyState = ({ title = 'No records found', description = 'New workflow items will appear here automatically.' }) => (
  <div className="panel flex min-h-64 flex-col items-center justify-center p-8 text-center">
    <div className="mb-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
      <Inbox className="h-10 w-10 text-slate-300" />
    </div>
    <h3 className="font-semibold text-slate-800 dark:text-white">{title}</h3>
    <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>
  </div>
);
