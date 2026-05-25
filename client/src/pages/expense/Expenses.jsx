import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Eye, Plus, Send, Trash2 } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ApprovalTimeline } from '../../components/common/ApprovalTimeline';
import { Drawer } from '../../components/common/Drawer';
import { EmptyState } from '../../components/common/EmptyState';
import { FilterBar } from '../../components/common/FilterBar';
import { Modal } from '../../components/common/Modal';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ExpenseForm } from '../../components/forms/ExpenseForm';
import { DataTable } from '../../components/tables/DataTable';
import { api } from '../../services/platform.service';

const money = (amount, currency = 'INR') => `${currency === 'INR' ? '₹' : currency} ${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
const DRAFT_STATUSES = ['DRAFT', 'SENT_BACK', 'draft', 'sent_back'];
const REVIEW_STATUSES = ['PENDING_MANAGER', 'PENDING_FINANCE', 'PENDING_ACCOUNTS', 'UNDER_VERIFICATION', 'manager_review', 'finance_review', 'cfo_review'];
const TERMINAL_STATUSES = ['REIMBURSED', 'CLOSED', 'REJECTED', 'approved', 'rejected', 'paid', 'reimbursed', 'closed'];

export const Expenses = () => {
  const [showForm, setShowForm] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [approvalExpense, setApprovalExpense] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const queryClient = useQueryClient();

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('new') === 'true' || searchParams.get('create') === 'true') {
      setShowForm(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data = [] } = useQuery({ queryKey: ['expenses'], queryFn: () => api.expenses({ mine: 'true' }) });
  const { data: sharedDetails } = useQuery({
    queryKey: ['shared-expense-details', selectedExpense?._id],
    queryFn: () => api.sharedExpenseDetails(selectedExpense._id),
    enabled: Boolean(selectedExpense?.isSharedExpense)
  });
  
  const create = useMutation({
    mutationFn: (payload) => payload.sharedExpense?.enabled ? api.createSharedExpense({
      ...payload,
      participantIds: payload.sharedExpense.participantIds,
      splitType: payload.sharedExpense.splitType,
      splitValues: payload.sharedExpense.splitValues,
      reimbursementMode: payload.sharedExpense.reimbursementMode
    }) : api.createExpense(payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); setShowForm(false); }
  });
  
  const submit = useMutation({
    mutationFn: api.submitExpense,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
    onError: (err) => alert(err.response?.data?.message || 'Submit failed')
  });

  const deleteDraft = useMutation({
    mutationFn: (id) => api.enterpriseDelete('expenses', id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
    onError: (err) => alert(err.response?.data?.message || 'Delete failed')
  });
  
  const act = useMutation({
    mutationFn: ({ id, payload }) => api.actExpense(id, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); setApprovalExpense(null); setNoteText(''); }
  });

  const [activeTab, setActiveTab] = useState('all');

  const filtered = useMemo(() => {
    return data.filter((expense) => {
      if (activeTab === 'draft' && !['DRAFT', 'draft'].includes(expense.status)) return false;
      if (activeTab === 'submitted' && !['submitted', 'manager_review', 'finance_review', 'cfo_review'].includes(expense.status)) return false;
      if (activeTab === 'approved' && !['approved', 'reimbursed', 'closed', 'paid'].includes(expense.status)) return false;
      if (activeTab === 'rejected' && !['rejected', 'sent_back'].includes(expense.status)) return false;

      const haystack = `${expense.category} ${expense.merchant} ${expense.employeeId?.name} ${expense.status}`.toLowerCase();
      return (!status || expense.status === status) && (!search || haystack.includes(search.toLowerCase()));
    });
  }, [data, activeTab, status, search]);

  const columns = useMemo(() => [
    { header: 'Employee', accessorFn: (row) => row.employeeId?.name || 'Me' },
    { header: 'Category', accessorKey: 'category' },
    { header: 'Merchant', accessorKey: 'merchant' },
    { header: 'Date', cell: ({ row }) => row.original.expenseDate ? new Date(row.original.expenseDate).toLocaleDateString('en-IN') : '-' },
    { header: 'Amount', cell: ({ row }) => <span className="font-semibold">{money(row.original.amount, row.original.currency)}</span> },
    { header: 'Shared', cell: ({ row }) => row.original.isSharedExpense ? <span className="chip">{row.original.participantCount} participants</span> : '-' },
    { header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    {
      header: 'Flags',
      cell: ({ row }) => {
        const flags = (row.original.fraudFlags?.length || 0) + (row.original.policyViolations?.length || 0);
        return flags
          ? <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300"><AlertTriangle className="h-3 w-3" />{flags} flag{flags > 1 ? 's' : ''}</span>
          : <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="h-3 w-3" />Clean</span>;
      }
    },
    {
      header: 'Action',
      cell: ({ row }) => {
        const exp = row.original;
        return (
          <div className="flex gap-2">
            <button className="btn-secondary px-2 py-1.5" onClick={() => setSelectedExpense(exp)} title="View details">
              <Eye className="h-4 w-4" />
            </button>
            {DRAFT_STATUSES.includes(exp.status) && (
              <>
                <button className="btn-primary py-1.5 flex items-center gap-1 text-xs" onClick={() => submit.mutate(exp._id)} disabled={submit.isPending}>
                  <Send className="h-3 w-3" /> Submit
                </button>
                <button className="btn-secondary text-rose-600 px-2 py-1.5 flex items-center justify-center" onClick={() => deleteDraft.mutate(exp._id)} disabled={deleteDraft.isPending} title="Delete draft">
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
            {REVIEW_STATUSES.includes(exp.status) && (
              <button className="btn-secondary py-1.5 text-xs" onClick={() => { setApprovalExpense(exp); setNoteText(''); }}>
                Approve
              </button>
            )}
          </div>
        );
      }
    }
  ], [submit.isPending, deleteDraft.isPending]);

  const severityColor = (sev) => sev === 'block' ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200' : 'border-amber-100 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200';

  return (
    <>
      <PageHeader
        title="Expenses"
        description="Create, draft, submit, upload receipts, and monitor policy or fraud signals."
        actions={
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> New Expense
          </button>
        }
      />

      <FilterBar
        search={search}
        onSearch={setSearch}
        status={status}
        onStatus={setStatus}
        statuses={['draft', 'submitted', 'manager_review', 'finance_review', 'cfo_review', 'approved', 'paid', 'rejected', 'sent_back']}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />

      <div className="mb-4 flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'all', label: 'All Expenses' },
          { id: 'draft', label: 'Draft' },
          { id: 'submitted', label: 'Submitted' },
          { id: 'approved', label: 'Approved' },
          { id: 'rejected', label: 'Rejected' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all duration-200 ${
              activeTab === tab.id
                ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Create Expense Drawer */}
      <Drawer
        open={showForm}
        title="Create New Expense"
        onClose={() => setShowForm(false)}
      >
        <ExpenseForm onSubmit={(values) => create.mutate(values)} isLoading={create.isPending} />
      </Drawer>

      {filtered.length
        ? <DataTable data={filtered} columns={columns} pageSize={pageSize} />
        : <EmptyState title="No matching expenses" description="Try changing filters or create a new expense." />
      }

      {/* Details Drawer */}
      <Drawer
        open={Boolean(selectedExpense)}
        title={`${selectedExpense?.category || 'Expense'} — ${money(selectedExpense?.amount, selectedExpense?.currency)}`}
        description={selectedExpense?.merchant || 'Expense details'}
        onClose={() => setSelectedExpense(null)}
      >
        {selectedExpense && (
          <div className="space-y-6">
            {/* Summary Grid */}
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['Amount', money(selectedExpense.amount, selectedExpense.currency)],
                ['Employee', selectedExpense.employeeId?.name || 'Me'],
                ['Department', selectedExpense.employeeId?.department || '-'],
                ['Date', selectedExpense.expenseDate ? new Date(selectedExpense.expenseDate).toLocaleDateString('en-IN') : '-'],
                ['Payment Mode', selectedExpense.paymentMode || '-'],
                ['Tax Amount', selectedExpense.taxAmount ? money(selectedExpense.taxAmount, selectedExpense.currency) : '—'],
                ['Receipts', `${selectedExpense.receipts?.length || 0} attached`],
                ['Status', selectedExpense.status]
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
                  <p className="mt-1 font-semibold dark:text-white capitalize">{value}</p>
                </div>
              ))}
            </div>

            {selectedExpense.description && (
              <section>
                <h3 className="mb-2 text-sm font-bold text-slate-700 dark:text-white">Business Purpose</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">{selectedExpense.description}</p>
              </section>
            )}

            <section>
              <h3 className="mb-3 font-bold dark:text-white">Approval Timeline</h3>
              <ApprovalTimeline steps={selectedExpense.approvalPath || []} />
            </section>

            {selectedExpense.isSharedExpense && (
              <section>
                <h3 className="mb-3 font-bold dark:text-white">Shared Allocation</h3>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="grid grid-cols-4 bg-slate-50 p-3 text-xs font-bold uppercase text-slate-500 dark:bg-slate-800">
                    <span>Employee</span><span>Amount</span><span>Percent</span><span>Status</span>
                  </div>
                  {(sharedDetails?.allocations || []).map((allocation) => {
                    const participant = (sharedDetails?.participants || []).find((item) => item.employeeId === allocation.employeeId);
                    return (
                      <div key={allocation._id} className="grid grid-cols-4 border-t border-slate-100 p-3 text-sm dark:border-slate-800">
                        <span className="font-medium dark:text-white">{participant?.employeeName || '-'}</span>
                        <span>{money(allocation.allocatedAmount, selectedExpense.currency)}</span>
                        <span>{allocation.splitPercentage}%</span>
                        <StatusBadge status={allocation.reimbursementStatus} />
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  Split method: <b>{selectedExpense.splitType}</b> · Reimbursement: <b>{selectedExpense.reimbursementMode === 'individual' ? 'Individual employees' : 'Creator full reimbursement'}</b>
                </div>
              </section>
            )}

            <section>
              <h3 className="mb-3 font-bold dark:text-white">Policy & Fraud Signals</h3>
              <div className="space-y-2">
                {[...(selectedExpense.policyViolations || []), ...(selectedExpense.fraudFlags || [])].length
                  ? [...(selectedExpense.policyViolations || []), ...(selectedExpense.fraudFlags || [])].map((flag) => (
                      <div key={flag.code} className={`rounded-xl border p-3 text-sm ${severityColor(flag.severity)}`}>
                        <span className="font-bold">{flag.code}</span>: {flag.message}
                        {flag.severity === 'block' && <span className="ml-2 text-xs font-bold uppercase">BLOCKED</span>}
                      </div>
                    ))
                  : <p className="rounded-xl bg-emerald-50 dark:bg-emerald-950 p-3 text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> No policy violations or fraud detected.</p>
                }
              </div>
            </section>

            {DRAFT_STATUSES.includes(selectedExpense.status) && (
              <button
                className="btn-primary w-full flex items-center justify-center gap-2"
                onClick={async () => {
                  await submit.mutateAsync(selectedExpense._id);
                  setSelectedExpense(null);
                }}
                disabled={submit.isPending}
              >
                <Send className="h-4 w-4" /> Submit for Approval
              </button>
            )}
          </div>
        )}
      </Drawer>

      {/* Approval Action Modal */}
      <Modal
        open={Boolean(approvalExpense)}
        title="Approval Action"
        description={`${approvalExpense?.category} · ${money(approvalExpense?.amount, approvalExpense?.currency)} · ${approvalExpense?.employeeId?.name || 'Employee'}`}
        onClose={() => { setApprovalExpense(null); setNoteText(''); }}
        footer={
          <>
            <button className="btn-secondary" onClick={() => act.mutate({ id: approvalExpense?._id, payload: { action: 'send_back', note: noteText } })} disabled={act.isPending}>Send Back</button>
            <button className="btn-secondary text-rose-600" onClick={() => act.mutate({ id: approvalExpense?._id, payload: { action: 'reject', note: noteText } })} disabled={act.isPending}>Reject</button>
            <button className="btn-primary" onClick={() => act.mutate({ id: approvalExpense?._id, payload: { action: 'approve', note: noteText } })} disabled={act.isPending}>
              {act.isPending ? 'Processing…' : 'Approve'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-4 grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-slate-500">Merchant</span><p className="font-medium dark:text-white">{approvalExpense?.merchant || '—'}</p></div>
            <div><span className="text-slate-500">Amount</span><p className="font-medium dark:text-white">{money(approvalExpense?.amount, approvalExpense?.currency)}</p></div>
            <div><span className="text-slate-500">Category</span><p className="font-medium dark:text-white">{approvalExpense?.category}</p></div>
            <div><span className="text-slate-500">Status</span><StatusBadge status={approvalExpense?.status} /></div>
          </div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Note (optional)
            <textarea
              className="input mt-1 min-h-16 w-full"
              placeholder="Add a note for the employee..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
          </label>
        </div>
      </Modal>
    </>
  );
};
