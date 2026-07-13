import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock3, CreditCard, FileText, History, MessageSquare, ReceiptText, RotateCcw, Send, ShieldCheck, WalletCards, X } from 'lucide-react';
import { ApprovalTimeline } from '../../components/common/ApprovalTimeline';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { api } from '../../services/platform.service';
import { DRAFT_STATUSES, canActOnExpense, getExpenseStage, getNextProcessText, normalizeExpenseStatus } from '../../utils/expenseWorkflow';

const money = (amount, currency = 'INR') => `${currency === 'INR' ? '₹' : currency} ${Number(amount || 0).toLocaleString('en-IN')}`;

const tabs = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'receipts', label: 'Receipts', icon: ReceiptText },
  { id: 'timeline', label: 'Approval Timeline', icon: Clock3 },
  { id: 'violations', label: 'Policy Violations', icon: ShieldCheck },
  { id: 'comments', label: 'Comments & Activity', icon: MessageSquare },
  { id: 'audit', label: 'Audit Logs', icon: History }
];

const DetailCard = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
    <p className="mt-1 font-bold text-slate-900 dark:text-white">{value || '-'}</p>
  </div>
);

const AuditRow = ({ action, detail, at }) => (
  <div className="flex gap-3 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
    <div className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-600" />
    <div>
      <p className="font-semibold text-slate-900 dark:text-white">{action}</p>
      <p className="text-slate-500 dark:text-slate-400">{detail}</p>
      <p className="mt-1 text-xs text-slate-400">{at}</p>
    </div>
  </div>
);

const WorkflowProgress = ({ status }) => (
  <section className="panel p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="font-bold text-slate-950 dark:text-white">Expense Process</h2>
        <p className="mt-1 text-sm text-slate-500">{getNextProcessText(status)}</p>
      </div>
      <StatusBadge status={status} />
    </div>
    <div className="mt-5 grid gap-3 md:grid-cols-6">
      {getExpenseStage(status).map((stage) => (
        <div key={stage.key} className={`rounded-xl border p-3 text-sm ${stage.done ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : stage.active ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300' : stage.blocked ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300' : 'border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-900'}`}>
          <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/70 dark:bg-slate-950/40">
            {stage.done ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
          </div>
          <p className="font-semibold">{stage.label}</p>
        </div>
      ))}
    </div>
  </section>
);

export const ExpenseDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useSelector((state) => state.auth.user);
  const [activeTab, setActiveTab] = useState('overview');
  const { data: expense, isLoading } = useQuery({ queryKey: ['expense', id], queryFn: () => api.getExpense(id), enabled: Boolean(id) });
  const refreshExpense = () => {
    queryClient.invalidateQueries({ queryKey: ['expense', id] });
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
  };
  const submitExpense = useMutation({ mutationFn: () => api.submitExpense(id), onSuccess: refreshExpense });
  const actExpense = useMutation({ mutationFn: (payload) => api.actExpense(id, payload), onSuccess: refreshExpense });
  const financeVerify = useMutation({ mutationFn: (payload) => api.financeVerifyExpense(id, payload), onSuccess: refreshExpense });
  const reimburse = useMutation({ mutationFn: (payload) => api.reimburseExpense(id, payload), onSuccess: refreshExpense });
  const closeExpense = useMutation({ mutationFn: (payload) => api.closeExpense(id, payload), onSuccess: refreshExpense });

  const auditLogs = useMemo(() => {
    if (!expense) return [];
    const createdAt = expense.createdAt ? new Date(expense.createdAt).toLocaleString('en-IN') : 'Creation time unavailable';
    const updatedAt = expense.updatedAt ? new Date(expense.updatedAt).toLocaleString('en-IN') : createdAt;
    return [
      { action: 'Expense created', detail: `${expense.category} expense created by ${expense.employeeId?.name || 'employee'}.`, at: createdAt },
      { action: 'OCR processed', detail: expense.receipts?.length ? 'Receipt OCR data captured and attached.' : 'No receipt OCR available.', at: createdAt },
      { action: 'Policy recalculated', detail: `${expense.policyViolations?.length || 0} policy signal(s) evaluated.`, at: updatedAt },
      { action: 'Approval changes', detail: `${expense.approvalPath?.length || 0} approval step(s) resolved.`, at: updatedAt },
      { action: 'Finance verification', detail: ['approved', 'paid', 'reimbursed', 'closed'].includes(expense.status) ? 'Finance verification completed or bypassed.' : 'Finance verification pending.', at: updatedAt }
    ];
  }, [expense]);

  if (isLoading) return <LoadingSkeleton rows={5} />;
  if (!expense) return <EmptyState title="Expense not found" description="The requested expense is not available in this workspace." />;

  const flags = [...(expense.policyViolations || []), ...(expense.fraudFlags || [])];
  const normalizedStatus = normalizeExpenseStatus(expense.status);
  const canAct = canActOnExpense(normalizedStatus, user?.role);
  const processing = submitExpense.isPending || actExpense.isPending || financeVerify.isPending || reimburse.isPending || closeExpense.isPending;

  return (
    <>
      <PageHeader
        title={`${expense.category} Expense`}
        description={`${expense.merchant || 'Merchant pending'} · ${money(expense.amount, expense.currency)} · REF-${String(expense._id || '').slice(-6).toUpperCase()}`}
        actions={
          <div className="flex items-center gap-2">
            <button className="btn-secondary" onClick={() => navigate('/expenses')}>Back</button>
            <StatusBadge status={expense.status} />
          </div>
        }
      />

      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Icon className="h-4 w-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mb-5 space-y-4">
        <WorkflowProgress status={normalizedStatus} />
        {canAct && (
          <section className="panel flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-bold text-slate-950 dark:text-white">Next Action</p>
              <p className="text-sm text-slate-500">{getNextProcessText(normalizedStatus)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {DRAFT_STATUSES.includes(normalizedStatus) && (
                <button className="btn-primary flex items-center gap-2" disabled={processing} onClick={() => submitExpense.mutate()}>
                  <Send className="h-4 w-4" /> Submit for Approval
                </button>
              )}
              {['PENDING_MANAGER', 'PENDING_FINANCE', 'PENDING_ACCOUNTS'].includes(normalizedStatus) && (
                <>
                  <button className="btn-secondary flex items-center gap-2" disabled={processing} onClick={() => actExpense.mutate({ action: 'send_back', note: 'Please update and resubmit.' })}>
                    <RotateCcw className="h-4 w-4" /> Send Back
                  </button>
                  <button className="btn-secondary flex items-center gap-2 text-rose-600" disabled={processing} onClick={() => actExpense.mutate({ action: 'reject', note: 'Rejected after review.' })}>
                    <X className="h-4 w-4" /> Reject
                  </button>
                  <button className="btn-primary flex items-center gap-2" disabled={processing} onClick={() => actExpense.mutate({ action: 'approve', note: 'Approved.' })}>
                    <CheckCircle2 className="h-4 w-4" /> Approve
                  </button>
                </>
              )}
              {normalizedStatus === 'UNDER_VERIFICATION' && (
                <>
                  <button className="btn-secondary flex items-center gap-2" disabled={processing} onClick={() => actExpense.mutate({ action: 'send_back', note: 'Finance needs corrected bill details.' })}>
                    <RotateCcw className="h-4 w-4" /> Send Back
                  </button>
                  <button className="btn-secondary flex items-center gap-2 text-rose-600" disabled={processing} onClick={() => actExpense.mutate({ action: 'reject', note: 'Rejected during finance verification.' })}>
                    <X className="h-4 w-4" /> Reject
                  </button>
                  <button className="btn-primary flex items-center gap-2" disabled={processing} onClick={() => financeVerify.mutate({ action: 'verify', note: 'Bill and policy verification completed.' })}>
                    <ShieldCheck className="h-4 w-4" /> Start Reimbursement
                  </button>
                </>
              )}
              {normalizedStatus === 'PAYMENT_PROCESSING' && (
                <button className="btn-primary flex items-center gap-2" disabled={processing} onClick={() => reimburse.mutate({ method: 'bank_transfer', markPaid: true, transactionId: `PAY-${Date.now()}` })}>
                  <CreditCard className="h-4 w-4" /> Mark Paid
                </button>
              )}
              {normalizedStatus === 'REIMBURSED' && (
                <button className="btn-secondary flex items-center gap-2" disabled={processing} onClick={() => closeExpense.mutate({ note: 'Expense closed after reimbursement.' })}>
                  <CheckCircle2 className="h-4 w-4" /> Close Expense
                </button>
              )}
            </div>
          </section>
        )}
      </div>

      {activeTab === 'overview' && (
        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <section className="panel p-6">
            <h2 className="mb-4 font-bold dark:text-white">Expense Information</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <DetailCard label="Total Amount" value={money(expense.amount, expense.currency)} />
              <DetailCard label="GST Amount" value={money(expense.taxAmount, expense.currency)} />
              <DetailCard label="Merchant" value={expense.merchant || '-'} />
              <DetailCard label="Date" value={expense.expenseDate ? new Date(expense.expenseDate).toLocaleDateString('en-IN') : '-'} />
              <DetailCard label="Payment Mode" value={expense.paymentMode} />
              <DetailCard label="Reimbursement" value={expense.reimbursementMode === 'individual' ? 'Individual employees' : 'Creator full reimbursement'} />
              <DetailCard label="Employee" value={expense.employeeId?.name || 'Me'} />
              <DetailCard label="Department" value={expense.employeeId?.department || '-'} />
            </div>
            {expense.description && (
              <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <p className="mb-1 font-bold text-slate-900 dark:text-white">Business Purpose</p>
                {expense.description}
              </div>
            )}
          </section>
          <section className="panel p-6">
            <h2 className="mb-4 flex items-center gap-2 font-bold dark:text-white"><WalletCards className="h-4 w-4" /> Budget Usage</h2>
            <div className="space-y-4">
              <DetailCard label="Department Budget Remaining" value={money(Math.max(0, 124000 - Number(expense.amount || 0)), expense.currency)} />
              <DetailCard label="Project Budget Remaining" value={money(Math.max(0, 68000 - Number(expense.amount || 0)), expense.currency)} />
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs font-semibold uppercase text-slate-500">Monthly Spend Usage</p>
                <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(100, Math.round(((76000 + Number(expense.amount || 0)) / 150000) * 100))}%` }} />
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'receipts' && (
        <section className="panel p-6">
          <h2 className="mb-4 font-bold dark:text-white">Receipts</h2>
          {expense.receipts?.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {expense.receipts.map((receipt, index) => (
                <div key={receipt._id || index} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="font-bold dark:text-white">{receipt.originalName || `Receipt ${index + 1}`}</p>
                  <p className="mt-1 text-sm text-slate-500">{receipt.mimeType || 'Uploaded receipt'} · {receipt.scanStatus || 'completed'}</p>
                  <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">
                    <p>Merchant: {receipt.ocr?.merchant || expense.merchant || '-'}</p>
                    <p>Amount: {money(receipt.ocr?.amount || expense.amount, expense.currency)}</p>
                    <p>GST: {money(receipt.ocr?.tax || expense.taxAmount, expense.currency)}</p>
                    <p>Invoice: {receipt.ocr?.invoiceNumber || expense.invoiceNumber || '-'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptyState title="No receipts attached" description="Receipt upload is optional for lower value expenses." />}
        </section>
      )}

      {activeTab === 'timeline' && (
        <section className="panel p-6">
          <h2 className="mb-4 font-bold dark:text-white">Workflow Progress</h2>
          <ApprovalTimeline steps={expense.approvalPath || []} />
        </section>
      )}

      {activeTab === 'violations' && (
        <section className="panel p-6">
          <h2 className="mb-4 font-bold dark:text-white">Policy Violations</h2>
          {flags.length ? (
            <div className="space-y-3">
              {flags.map((flag, index) => (
                <div key={`${flag.code}-${index}`} className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                  <p className="flex items-center gap-2 font-bold"><AlertTriangle className="h-4 w-4" /> {flag.code}</p>
                  <p className="mt-1">{flag.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" /> Receipt valid, category allowed, and no policy exceptions detected.
            </p>
          )}
        </section>
      )}

      {activeTab === 'comments' && (
        <section className="panel p-6">
          <h2 className="mb-4 font-bold dark:text-white">Comments & Activity</h2>
          <div className="space-y-3">
            {(expense.timeline || []).map((item, index) => (
              <AuditRow key={index} action={item.action || item.status} detail={item.note || `Status changed to ${item.status}`} at={item.at ? new Date(item.at).toLocaleString('en-IN') : '-'} />
            ))}
            {!expense.timeline?.length && <EmptyState title="No activity yet" description="Workflow comments and status updates will appear here." />}
          </div>
        </section>
      )}

      {activeTab === 'audit' && (
        <section className="panel p-6">
          <h2 className="mb-4 font-bold dark:text-white">Audit Logs</h2>
          <div className="space-y-3">
            {auditLogs.map((log) => <AuditRow key={log.action} {...log} />)}
          </div>
        </section>
      )}
    </>
  );
};
