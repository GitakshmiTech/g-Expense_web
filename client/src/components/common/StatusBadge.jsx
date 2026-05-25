const tones = {
  UNDER_VERIFICATION: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  REIMBURSED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  CLOSED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  REJECTED: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  SENT_BACK: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  SUBMITTED: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  PENDING_MANAGER: 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  PENDING_FINANCE: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
  PENDING_ACCOUNTS: 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300',
  DRAFT: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  OCR_PROCESSING: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  VALIDATING: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  PAYMENT_PROCESSING: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  approved: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  finance_verified: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  reimbursed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  closed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  rejected: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  sent_back: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  submitted: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  manager_review: 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  finance_review: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
  cfo_review: 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300',
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  paid: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  processing: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
};

export const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${tones[status] || 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'}`}>
    {String(status || 'unknown').replaceAll('_', ' ')}
  </span>
);
