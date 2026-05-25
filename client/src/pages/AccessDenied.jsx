import { ShieldX } from 'lucide-react';

export const AccessDenied = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <ShieldX className="mx-auto h-10 w-10 text-rose-500" />
      <h1 className="mt-4 text-xl font-bold text-slate-950 dark:text-white">Access denied</h1>
      <p className="mt-2 text-sm text-slate-500">You do not have permission to open this page.</p>
    </div>
  </div>
);
