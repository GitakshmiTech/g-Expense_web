import { Check, RotateCcw, X } from 'lucide-react';
import { EmptyState } from '../common/EmptyState';
import { StatusBadge } from '../common/StatusBadge';

export const ApprovalQueue = ({ expenses = [], onAction }) => (
  <div className="panel p-5">
    <h2 className="mb-1 text-base font-bold text-slate-950 dark:text-white">Approval Queue</h2>
    <p className="mb-4 text-sm text-slate-500">Manager, finance, and CFO actions.</p>
    {!expenses.length && <EmptyState title="No pending approvals" description="Submitted reports and expenses will appear here." />}
    <div className="space-y-3">
      {expenses.slice(0, 6).map((expense) => (
        <div key={expense._id} className="rounded-2xl border border-slate-100 p-3 transition hover:border-brand-100 hover:bg-brand-50/40 dark:border-slate-800 dark:hover:bg-slate-800 md:flex md:items-center md:justify-between">
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">{expense.category} · {expense.merchant || 'No merchant'}</p>
            <p className="text-sm text-slate-500">{expense.employeeId?.name || 'Employee'} · {expense.amount} {expense.currency}</p>
          </div>
          <div className="mt-3 flex items-center gap-2 md:mt-0">
            <StatusBadge status={expense.status} />
            <button className="btn-secondary px-2" onClick={() => onAction(expense._id, { action: 'approve' })}><Check className="h-4 w-4" /></button>
            <button className="btn-secondary px-2" onClick={() => onAction(expense._id, { action: 'send_back' })}><RotateCcw className="h-4 w-4" /></button>
            <button className="btn-secondary px-2" onClick={() => onAction(expense._id, { action: 'reject' })}><X className="h-4 w-4" /></button>
          </div>
        </div>
      ))}
    </div>
  </div>
);
