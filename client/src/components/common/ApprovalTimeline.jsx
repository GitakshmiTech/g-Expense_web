import { CheckCircle2, Circle, Clock3 } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

export const ApprovalTimeline = ({ steps = [] }) => {
  const fallback = [
    { approverRole: 'employee', status: 'submitted' },
    { approverRole: 'manager', status: 'pending' },
    { approverRole: 'finance', status: 'pending' },
    { approverRole: 'reimbursement', status: 'pending' }
  ];
  const items = steps.length ? steps : fallback;

  return (
    <div className="space-y-4">
      {items.map((step, index) => {
        const done = ['approved', 'submitted', 'paid'].includes(step.status);
        const Icon = done ? CheckCircle2 : step.status === 'pending' ? Clock3 : Circle;
        return (
          <div key={`${step.approverRole}-${index}`} className="relative flex gap-3">
            {index < items.length - 1 && <div className="absolute left-4 top-8 h-full w-px bg-slate-200 dark:bg-slate-800" />}
            <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${done ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold capitalize text-slate-900 dark:text-white">{String(step.approverRole || 'review').replaceAll('_', ' ')}</p>
                <StatusBadge status={step.status} />
              </div>
              {step.note && <p className="mt-1 text-sm text-slate-500">{step.note}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
};
