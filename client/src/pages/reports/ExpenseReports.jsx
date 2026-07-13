import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, FileText, FolderPlus, Plus, Send, X, ClipboardList, CheckCircle2, AlertCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Drawer } from '../../components/common/Drawer';
import { EmptyState } from '../../components/common/EmptyState';
import { DataTable } from '../../components/tables/DataTable';
import { Modal } from '../../components/common/Modal';
import { api } from '../../services/platform.service';

const money = (amount, currency = 'INR') => `${currency === 'INR' ? '₹' : currency} ${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

export const ExpenseReports = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedReport, setSelectedReport] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Form States for creating a report
  const [title, setTitle] = useState('');
  const [selectedExpenseIds, setSelectedExpenseIds] = useState([]);

  // Fetch Reports
  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ['expense-reports'],
    queryFn: api.expenseReports
  });

  // Fetch Draft Expenses for linking to new report
  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => api.expenses({ mine: 'true' })
  });

  // Filter expenses that are drafts and not already linked to a report
  const draftExpenses = useMemo(() => {
    return expenses.filter(e => ['draft', 'DRAFT', 'sent_back', 'SENT_BACK'].includes(e.status) && !e.reportId);
  }, [expenses]);

  // Mutations
  const createReport = useMutation({
    mutationFn: (payload) => api.createExpenseReport(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-reports'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setShowCreateModal(false);
      setTitle('');
      setSelectedExpenseIds([]);
    },
    onError: (err) => alert(err.response?.data?.message || 'Failed to create report')
  });

  const submitReport = useMutation({
    mutationFn: (id) => api.submitExpenseReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-reports'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setSelectedReport(null);
    },
    onError: (err) => alert(err.response?.data?.message || 'Failed to submit report')
  });

  // Filtered reports by active tab
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const status = (r.status || 'draft').toLowerCase();
      if (activeTab === 'draft' && !['draft', 'sent_back'].includes(status)) return false;
      if (activeTab === 'submitted' && status !== 'submitted') return false;
      if (activeTab === 'approved' && !['manager_approved', 'finance_verified', 'reimbursement_pending', 'reimbursed', 'closed'].includes(status)) return false;
      if (activeTab === 'rejected' && status !== 'rejected') return false;
      return true;
    });
  }, [reports, activeTab]);

  const toggleExpenseSelection = (id) => {
    setSelectedExpenseIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const columns = useMemo(() => [
    { header: 'Report No', accessorKey: 'reportNo' },
    { header: 'Title', accessorKey: 'title' },
    { header: 'Date Created', cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString('en-IN') },
    { 
      header: 'Total Amount', 
      cell: ({ row }) => (
        <span className="font-semibold">
          {money(row.original.total?.amount || row.original.totalAmount || 0, row.original.total?.currency || row.original.currency)}
        </span>
      )
    },
    { 
      header: 'Expenses Count', 
      cell: ({ row }) => (row.original.expenseIds || row.original.expenses || []).length 
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
          onClick={() => setSelectedReport(row.original)}
        >
          <Eye className="h-4 w-4" /> View
        </button>
      )
    }
  ], []);

  // Find expenses linked to the selected report for detail drawer
  const linkedExpenses = useMemo(() => {
    if (!selectedReport) return [];
    const reportExpenseIds = (selectedReport.expenseIds || selectedReport.expenses || []).map(id => String(id));
    return expenses.filter(e => reportExpenseIds.includes(String(e._id)));
  }, [selectedReport, expenses]);

  return (
    <>
      <PageHeader
        title="Expense Reports"
        description="Compile individual expenses into comprehensive reports for manager and finance review."
        actions={
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" /> Create Report
          </button>
        }
      />

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'all', label: 'All Reports' },
          { id: 'draft', label: 'Drafts' },
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

      {/* Reports Table */}
      {filteredReports.length > 0 ? (
        <DataTable data={filteredReports} columns={columns} />
      ) : (
        <EmptyState 
          title="No reports found" 
          description="Create a report by grouping draft expenses to start the reimbursement process." 
        />
      )}

      {/* Create Report Modal */}
      <Modal
        open={showCreateModal}
        title="Create Expense Report"
        description="Select from your available draft expenses to bundle into a single submit-ready report."
        onClose={() => {
          setShowCreateModal(false);
          setTitle('');
          setSelectedExpenseIds([]);
        }}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
            <button 
              className="btn-primary flex items-center gap-1"
              disabled={!title || createReport.isPending}
              onClick={() => createReport.mutate({ title, expenseIds: selectedExpenseIds })}
            >
              {createReport.isPending ? 'Creating...' : 'Create Draft Report'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Report Title <span className="text-rose-500">*</span>
            </label>
            <input 
              className="input w-full"
              placeholder="e.g. Q2 Customer Relations Trip"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
              Select Draft Expenses <span className="text-rose-500">*</span>
            </label>
            
            {draftExpenses.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/30">
                {draftExpenses.map((exp) => (
                  <label key={exp._id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:border-brand-500 dark:hover:border-brand-500 transition-colors">
                    <input 
                      type="checkbox" 
                      className="h-4 w-4 text-brand-600 rounded"
                      checked={selectedExpenseIds.includes(exp._id)}
                      onChange={() => toggleExpenseSelection(exp._id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">{exp.category}</p>
                        <p className="font-bold text-sm text-slate-950 dark:text-white shrink-0">{money(exp.amount, exp.currency)}</p>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 mt-0.5">
                        <span>{exp.merchant || 'Unspecified Merchant'}</span>
                        <span>{exp.expenseDate ? new Date(exp.expenseDate).toLocaleDateString() : '-'}</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <FolderPlus className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-350">No draft expenses available</p>
                <p className="text-xs text-slate-400 mt-0.5">Please create new draft expenses first.</p>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Details Drawer */}
      <Drawer
        open={Boolean(selectedReport)}
        title={selectedReport?.title || 'Report Details'}
        description={`Report ID: ${selectedReport?.reportNo || '-'}`}
        onClose={() => setSelectedReport(null)}
      >
        {selectedReport && (
          <div className="space-y-6">
            {/* Highlights Grid */}
            <div className="grid gap-3 grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                <p className="text-xs uppercase tracking-wide text-slate-500">Total Amount</p>
                <p className="mt-1 text-lg font-bold text-brand-600 dark:text-brand-400">
                  {money(selectedReport.total?.amount || selectedReport.totalAmount || 0, selectedReport.total?.currency || selectedReport.currency)}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
                <div className="mt-2.5">
                  <StatusBadge status={selectedReport.status} />
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                <p className="text-xs uppercase tracking-wide text-slate-500">Expenses Linked</p>
                <p className="mt-1 font-semibold dark:text-white">
                  {(selectedReport.expenseIds || selectedReport.expenses || []).length} items
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                <p className="text-xs uppercase tracking-wide text-slate-500">Submitted Date</p>
                <p className="mt-1 font-semibold dark:text-white">
                  {selectedReport.submittedAt ? new Date(selectedReport.submittedAt).toLocaleDateString('en-IN') : 'Not Submitted'}
                </p>
              </div>
            </div>

            {/* Expenses List */}
            <section>
              <h3 className="mb-3 font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <ClipboardList className="h-4 w-4 text-brand-600" /> Linked Expenses List
              </h3>
              {linkedExpenses.length > 0 ? (
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {linkedExpenses.map((exp) => (
                    <div key={exp._id} className="flex justify-between items-center p-4 bg-white dark:bg-slate-900">
                      <div>
                        <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">{exp.category}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{exp.merchant} · {new Date(exp.expenseDate).toLocaleDateString()}</p>
                      </div>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">{money(exp.amount, exp.currency)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No expense details available or cached.</p>
              )}
            </section>

            {/* Approval Workflow Details */}
            {selectedReport.lifecycle && selectedReport.lifecycle.length > 0 && (
              <section>
                <h3 className="mb-3 font-bold text-sm text-slate-900 dark:text-white">Approval History Timeline</h3>
                <div className="space-y-4">
                  {selectedReport.lifecycle.map((log, idx) => (
                    <div key={idx} className="flex gap-3 text-sm">
                      <div className="h-2 w-2 rounded-full bg-brand-600 mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-slate-800 dark:text-slate-200">
                          Report status changed to <span className="font-semibold capitalize">{log.status}</span>
                        </p>
                        {log.reason && <p className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/20 p-2 rounded-lg mt-1">Comment: "{log.reason}"</p>}
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {new Date(log.changedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Action Panel for Drafts */}
            {['draft', 'sent_back'].includes((selectedReport.status || '').toLowerCase()) && (
              <button
                className="btn-primary w-full flex items-center justify-center gap-2 mt-4 py-2.5 shadow-lg shadow-brand-500/20"
                onClick={() => submitReport.mutate(selectedReport._id)}
                disabled={submitReport.isPending}
              >
                <Send className="h-4 w-4" />
                {submitReport.isPending ? 'Submitting...' : 'Submit Report for Approval'}
              </button>
            )}
          </div>
        )}
      </Drawer>
    </>
  );
};
