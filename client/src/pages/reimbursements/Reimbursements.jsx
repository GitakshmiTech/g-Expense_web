import { useQuery } from '@tanstack/react-query';
import { Eye, Landmark, Calendar, FileText, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Drawer } from '../../components/common/Drawer';
import { EmptyState } from '../../components/common/EmptyState';
import { DataTable } from '../../components/tables/DataTable';
import { api } from '../../services/platform.service';

const money = (amount, currency = 'INR') => `${currency === 'INR' ? '₹' : currency} ${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

export const Reimbursements = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);

  // Fetch settlements using the enterprise list endpoint
  const { data, isLoading } = useQuery({
    queryKey: ['reimbursements'],
    queryFn: () => api.enterpriseList('reimbursements', { limit: 100 })
  });

  const records = Array.isArray(data) ? data : data?.items || [];

  // Filter records by tab
  const filtered = useMemo(() => {
    return records.filter(item => {
      const status = (item.status || 'pending').toLowerCase();
      if (activeTab === 'pending' && !['pending', 'processing'].includes(status)) return false;
      if (activeTab === 'paid' && status !== 'paid') return false;
      if (activeTab === 'failed' && status !== 'failed') return false;
      return true;
    });
  }, [records, activeTab]);

  const columns = useMemo(() => [
    { header: 'Reimbursement No', accessorKey: 'reimbursementNo' },
    { 
      header: 'Amount', 
      cell: ({ row }) => (
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
          {money(row.original.amount?.amount || row.original.amount || 0, row.original.amount?.currency || row.original.currency)}
        </span>
      )
    },
    { 
      header: 'Method', 
      cell: ({ row }) => (
        <span className="capitalize">{String(row.original.method || 'bank_transfer').replace(/_/g, ' ')}</span>
      )
    },
    { 
      header: 'Payment Reference', 
      cell: ({ row }) => row.original.reference || '—' 
    },
    { 
      header: 'Payment Date', 
      cell: ({ row }) => row.original.paidAt ? new Date(row.original.paidAt).toLocaleDateString('en-IN') : '—' 
    },
    { 
      header: 'Status', 
      cell: ({ row }) => <StatusBadge status={row.original.status} /> 
    },
    {
      header: 'Action',
      cell: ({ row }) => (
        <button 
          className="btn-secondary px-2.5 py-1.5 flex items-center gap-1 text-xs" 
          onClick={() => setSelectedItem(row.original)}
        >
          <Eye className="h-4 w-4" /> View
        </button>
      )
    }
  ], []);

  return (
    <>
      <PageHeader
        title="Reimbursements"
        description="Monitor settlements, transaction reference numbers, and completed transfer timelines."
      />

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'all', label: 'All Transfers' },
          { id: 'pending', label: 'Pending & Processing' },
          { id: 'paid', label: 'Paid & Settled' },
          { id: 'failed', label: 'Failed Payments' }
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

      {filtered.length > 0 ? (
        <DataTable data={filtered} columns={columns} />
      ) : (
        <EmptyState 
          title="No settlements found" 
          description="Your verified and approved expenses will appear here once finance begins payment processing." 
        />
      )}

      {/* Detail Drawer */}
      <Drawer
        open={Boolean(selectedItem)}
        title={selectedItem?.reimbursementNo || 'Settlement Details'}
        description="Transaction history and bank details reference"
        onClose={() => setSelectedItem(null)}
      >
        {selectedItem && (
          <div className="space-y-6">
            {/* Highlights Card */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 bg-slate-50/50 dark:bg-slate-900/30 text-center">
              <Landmark className="h-10 w-10 text-brand-600 mx-auto mb-3" />
              <p className="text-xs uppercase font-medium text-slate-500 tracking-wider">Settled Amount</p>
              <h3 className="text-3xl font-extrabold text-slate-950 dark:text-white mt-1">
                {money(selectedItem.amount?.amount || selectedItem.amount || 0, selectedItem.amount?.currency || selectedItem.currency)}
              </h3>
              <div className="mt-3 flex justify-center">
                <StatusBadge status={selectedItem.status} />
              </div>
            </div>

            {/* Info grid */}
            <div className="grid gap-3 grid-cols-2">
              {[
                ['Payment Method', String(selectedItem.method || 'bank_transfer').replace(/_/g, ' ')],
                ['Transaction ID', selectedItem.reference || '—'],
                ['Payment Date', selectedItem.paidAt ? new Date(selectedItem.paidAt).toLocaleString('en-IN') : '—'],
                ['Retries Count', selectedItem.retryCount ?? 0]
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
                  <p className="mt-1 font-semibold dark:text-white capitalize">{value}</p>
                </div>
              ))}
            </div>

            {/* Rejection / Failure Notice */}
            {selectedItem.status === 'failed' && (
              <section className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-900/30 dark:bg-rose-950/15">
                <h4 className="text-sm font-bold text-rose-800 dark:text-rose-400 flex items-center gap-1.5 mb-1.5">
                  <AlertCircle className="h-4.5 w-4.5 text-rose-600" /> Transaction Failure Notice
                </h4>
                <p className="text-xs text-rose-700 dark:text-rose-300">
                  {selectedItem.failureReason || 'Transfer rejected by receiving bank. Please check your Bank Details under Profile & Settings.'}
                </p>
                <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  <RefreshCw className="h-3.5 w-3.5" /> Finance department will automatically retry settling this payment.
                </div>
              </section>
            )}

            {/* General FAQs */}
            <section className="border-t border-slate-100 dark:border-slate-800 pt-5">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2">Reimbursement Policy Guidelines</h4>
              <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
                <li className="flex gap-2">
                  <span className="text-brand-600 shrink-0">•</span>
                  <span>Payments are processed directly to your registered bank account on the next immediate payroll cycle.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-brand-600 shrink-0">•</span>
                  <span>If transaction fails, please verify IFSC code and account number matching under settings.</span>
                </li>
              </ul>
            </section>
          </div>
        )}
      </Drawer>
    </>
  );
};
