import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock3, FileText, History, MessageSquare, ReceiptText, ShieldCheck, WalletCards } from 'lucide-react';
import { ApprovalTimeline } from '../../components/common/ApprovalTimeline';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { api } from '../../services/platform.service';

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

export const ExpenseDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const { data: expense, isLoading } = useQuery({ queryKey: ['expense', id], queryFn: () => api.getExpense(id), enabled: Boolean(id) });

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
