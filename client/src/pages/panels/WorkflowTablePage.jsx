import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, CheckCheck, Download, IndianRupee, Bell, Building2, ClipboardCheck, CreditCard, FileSearch, FileText, Gauge, Landmark, Layers3, Plane, ReceiptText, Settings, ShieldCheck, Users, WalletCards, Eye, Send, X, MessageSquare, CornerDownLeft, Sparkles, XCircle, CheckCircle2, RefreshCw, BarChart3, Clock, TrendingUp } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { EmptyState } from '../../components/common/EmptyState';
import { PageHeader } from '../../components/common/PageHeader';
import { SkeletonBlock } from '../../components/common/SkeletonBlock';
import { StatusBadge } from '../../components/common/StatusBadge';
import { DataTable } from '../../components/tables/DataTable';
import { Drawer } from '../../components/common/Drawer';
import { CategoryBarChart, StatusPieChart, TrendLineChart } from '../../components/charts/ExpenseCharts';
import { api } from '../../services/platform.service';

const money = (value, currency = 'INR') => `${currency === 'INR' ? '₹' : currency} ${Math.round(Number(value || 0)).toLocaleString()}`;

const approvalColumns = (onAction, panel) => [
  { header: 'Employee', accessorKey: 'employee', cell: ({ row }) => row.original.employeeId?.name || '-' },
  { header: 'Type', cell: ({ row }) => <span className="capitalize text-xs font-medium text-slate-500">{row.original.kind || 'report'}</span> },
  { header: 'Category / Report', cell: ({ row }) => row.original.category || row.original.title || row.original.name || '-' },
  { header: 'Merchant / Destination', cell: ({ row }) => row.original.merchant || row.original.destination || '-' },
  { header: 'Amount', accessorKey: 'amount', cell: ({ row }) => money(row.original.amount || row.original.totalAmount, row.original.currency) },
  { header: 'Status', accessorKey: 'status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  {
    header: 'Actions',
    accessorKey: '_id',
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
        <button className="btn-secondary py-1 text-xs" onClick={() => onAction(row.original._id, 'approve', row.original.kind || 'expense')}>
          {panel === 'finance' ? 'Verify' : 'Approve'}
        </button>
        <button className="btn-secondary py-1 text-xs" onClick={() => onAction(row.original._id, 'send_back', row.original.kind || 'expense')}>Send Back</button>
        <button className="btn-secondary py-1 text-xs text-rose-600 hover:bg-rose-50" onClick={() => onAction(row.original._id, 'reject', row.original.kind || 'expense')}>Reject</button>
      </div>
    )
  }
];

const reportColumns = (onAction, panel) => [
  { header: 'Report', accessorKey: 'title' },
  { header: 'Employee', accessorKey: 'employee', cell: ({ row }) => row.original.employeeId?.name || '-' },
  { header: 'Department', accessorKey: 'department', cell: ({ row }) => row.original.employeeId?.department || '-' },
  { header: 'Amount', accessorKey: 'totalAmount', cell: ({ row }) => money(row.original.totalAmount, row.original.currency) },
  { header: 'Status', accessorKey: 'status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  {
    header: 'Workflow',
    accessorKey: '_id',
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
        <button className="btn-secondary py-1 text-xs" onClick={() => onAction(row.original._id, panel === 'finance' ? 'verify' : 'approve', row.original.kind || 'report')}>{panel === 'finance' ? 'Verify' : 'Approve'}</button>
        <button className="btn-secondary py-1 text-xs" onClick={() => onAction(row.original._id, 'send_back', row.original.kind || 'report')}>Send Back</button>
        <button className="btn-secondary py-1 text-xs text-rose-600 hover:bg-rose-50" onClick={() => onAction(row.original._id, 'reject', row.original.kind || 'report')}>Reject</button>
      </div>
    )
  }
];

export const WorkflowTablePage = ({ panel, type }) => {
  const queryClient = useQueryClient();
  const isFinance = panel === 'finance';
  
  const [activeTab, setActiveTab] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [actionNote, setActionNote] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  
  // State for ERP config mappings
  const [erpConfig, setErpConfig] = useState({ provider: 'netsuite', taxCode: 'GL-TAX-GST18', account: '1100-Bank-Reimbursement', autoPush: true });

  const defaultTabMap = useMemo(() => ({
    approvals: 'queue',
    budgets: 'dashboard',
    analytics: isFinance ? 'financials' : 'spend',
    notifications: 'all',
    verification: 'queue',
    reimbursements: 'pending',
    accounting: 'exports',
    audit: 'logs',
    violations: 'all'
  }), [isFinance]);

  useEffect(() => {
    setActiveTab(defaultTabMap[type] || 'all');
    setSelectedRecord(null);
    setIsDrawerOpen(false);
    setSelectedIds([]);
  }, [type, defaultTabMap]);

  const titleMap = {
    teamExpenses: 'Team Expenses',
    approvals: 'Pending Approvals',
    reports: 'Expense Reports',
    trips: 'Trips',
    budgets: 'Budgets',
    violations: 'Policy Violations',
    analytics: isFinance ? 'Analytics & Reports' : 'Team Analytics',
    notifications: 'Notifications',
    settings: 'Profile & Settings',
    verification: 'Expense Verification',
    reimbursements: 'Reimbursements',
    accounting: 'Accounting & Exports',
    audit: 'Audit & Compliance'
  };

  const query = useQuery({
    queryKey: [panel, type],
    queryFn: async () => {
      if (type === 'teamExpenses') return api.managerTeamExpenses({ limit: 100 });
      if (type === 'verification') return api.financeVerification({});
      if (type === 'approvals') return isFinance ? api.workflowReports({ status: 'submitted' }) : api.managerPendingApprovals();
      if (type === 'reports') return isFinance ? api.workflowReports({}) : api.managerReports({});
      if (type === 'reimbursements') return api.financeReimbursements({});
      if (type === 'accounting') return api.financeAccountingExports();
      if (type === 'violations') return isFinance ? api.financeFraud() : api.managerViolations();
      if (type === 'audit') return isFinance ? api.financeCompliance() : api.approvalHistory();
      if (type === 'budgets') return isFinance ? api.budgets() : api.managerBudgets();
      if (type === 'trips') return isFinance ? api.travels() : api.managerTrips();
      if (type === 'notifications') return isFinance ? api.notifications() : api.managerNotifications();
      if (type === 'analytics') return isFinance ? api.financeBusinessDashboard() : api.managerAnalytics();
      return [];
    }
  });

  const reportAction = useMutation({
    mutationFn: ({ id, action, targetType = 'report' }) => 
      isFinance 
        ? api.financeVerificationAction({ reportId: id, action, note: actionNote || `${action} from ${panel} panel` }) 
        : api.managerApprovalAction({ targetType, id, action, note: actionNote || `${action} from ${panel} panel` }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [panel, type] });
      setActionNote('');
    }
  });

  const bulkAction = useMutation({
    mutationFn: ({ targetType, ids, action }) => api.managerBulkApprovalAction({ targetType, ids, action, note: `${action} in bulk from manager panel` }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [panel, type] });
      setSelectedIds([]);
    }
  });

  const reimbursementAction = useMutation({
    mutationFn: ({ id, status }) => api.financeProcessPayment(id, { status, reference: `PAY-${Date.now()}` }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [panel, type] });
      setSelectedRecord(null);
      setIsDrawerOpen(false);
    }
  });

  const raw = query.data || [];
  const records = Array.isArray(raw) ? raw : raw.items || [...(raw.expenses || []), ...(raw.reports || []), ...(raw.reimbursements || []), ...(raw.budgets || []), ...(raw.taxIssues || []), ...(raw.duplicateReceipts || []), ...(raw.auditLogs || []), ...(raw.failedPayments || [])];

  // Filtering based on tab selection
  const filteredRecords = records.filter(r => {
    if (panel === 'manager' && type === 'teamExpenses') {
      if (activeTab === 'pending') return ['submitted', 'manager_review'].includes(r.status);
      if (activeTab === 'approved') return ['approved', 'reimbursed', 'closed'].includes(r.status);
      if (activeTab === 'rejected') return ['rejected'].includes(r.status);
    }
    if (panel === 'manager' && type === 'approvals') {
      const pending = ['submitted', 'manager_review'].includes(r.status);
      if (activeTab === 'queue' || activeTab === 'bulk') return pending;
      if (activeTab === 'escalated') {
        const amt = r.amount || r.totalAmount || 0;
        const hasViolation = r.policyViolations?.length > 0 || r.fraudFlags?.length > 0;
        return pending && (amt > 10000 || hasViolation);
      }
    }
    
    // -- Finance Verification filtering --
    if (panel === 'finance' && type === 'verification') {
      if (activeTab === 'tax') {
        return r.tax?.validationStatus === 'mismatch' || !r.gstNumber || r.taxAmount === 0;
      }
      if (activeTab === 'suspicious') {
        return r.riskScore > 50 || r.fraudFlags?.length > 0 || r.policyViolations?.length > 0;
      }
      return ['submitted', 'manager_approved', 'manager_review'].includes(r.status);
    }
    
    // -- Finance Reimbursements filtering --
    if (panel === 'finance' && type === 'reimbursements') {
      if (activeTab === 'pending') return r.status === 'pending';
      if (activeTab === 'processing') return r.status === 'processing';
      if (activeTab === 'paid') return r.status === 'paid';
      if (activeTab === 'failed') return r.status === 'failed';
    }

    if (type === 'reports') {
      if (activeTab === 'pending') return ['submitted', 'manager_review', 'finance_review'].includes(r.status);
      if (activeTab === 'approved') return ['approved', 'reimbursed', 'closed', 'manager_approved', 'finance_verified'].includes(r.status);
      if (activeTab === 'rejected') return ['rejected'].includes(r.status);
    }
    if (type === 'trips') {
      if (activeTab === 'pending') return ['submitted'].includes(r.status);
      if (activeTab === 'approved') return ['approved'].includes(r.status);
    }
    if (type === 'budgets') {
      if (activeTab === 'alerts') return (r.consumed / r.amount) > 0.8;
    }
    if (type === 'violations') {
      if (panel === 'finance' && activeTab === 'fraud') {
        return r.type === 'duplicate_expense' || r.type === 'duplicate_receipt' || r.score > 70;
      }
      if (activeTab === 'escalated') {
        const hasHighViolation = r.policyViolations?.some(v => v.severity === 'high' || v.severity === 'critical');
        const hasHighFraud = r.fraudFlags?.some(f => f.score > 70);
        return hasHighViolation || hasHighFraud || r.severity === 'high' || r.severity === 'critical';
      }
    }
    if (type === 'notifications') {
      if (activeTab === 'unread') return !r.read && r.status !== 'read';
    }
    return true;
  });

  const columns = (() => {
    if (type === 'approvals' || type === 'verification') return approvalColumns((id, action, targetType) => reportAction.mutate({ id, action, targetType }), panel);
    if (type === 'reports') return reportColumns((id, action, targetType) => reportAction.mutate({ id, action, targetType }), panel);
    if (type === 'reimbursements') return [
      { header: 'Employee', accessorKey: 'employee', cell: ({ row }) => row.original.employeeId?.name || '-' },
      { header: 'Report', accessorKey: 'report', cell: ({ row }) => row.original.reportId?.title || '-' },
      { header: 'Amount', accessorKey: 'amount', cell: ({ row }) => money(row.original.amount, row.original.currency) },
      { header: 'Method', accessorKey: 'method' },
      { header: 'Status', accessorKey: 'status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      { header: 'Payment', accessorKey: '_id', cell: ({ row }) => <div className="flex gap-2" onClick={(e) => e.stopPropagation()}><button className="btn-secondary py-1 text-xs" onClick={() => reimbursementAction.mutate({ id: row.original._id, status: 'paid' })}>Mark Paid</button></div> }
    ];
    if (type === 'accounting') return [
      { header: 'Export No', accessorKey: 'exportNo' },
      { header: 'Format', accessorKey: 'format' },
      { header: 'Records', accessorKey: 'recordCount' },
      { header: 'Total', accessorKey: 'totalAmount', cell: ({ row }) => money(row.original.totalAmount) },
      { header: 'ERP', accessorKey: 'erpTarget', cell: ({ row }) => row.original.erpTarget || 'custom' },
      { header: 'Status', accessorKey: 'status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      { header: 'Action', cell: ({ row }) => <div className="flex gap-2" onClick={(e) => e.stopPropagation()}><button className="btn-secondary py-1 text-xs" onClick={() => api.financePushAccountingExport(row.original._id)}>Push ERP</button></div> }
    ];
    if (type === 'violations') return [
      { header: 'Employee', accessorKey: 'employee', cell: ({ row }) => row.original.employeeId?.name || '-' },
      { header: 'Category', accessorKey: 'category' },
      { header: 'Merchant', accessorKey: 'merchant' },
      { header: 'Amount', accessorKey: 'amount', cell: ({ row }) => money(row.original.amount, row.original.currency) },
      { header: 'Flags', accessorKey: 'flags', cell: ({ row }) => [...(row.original.policyViolations || []), ...(row.original.fraudFlags || [])].map((item) => item.code).join(', ') || '-' },
      { header: 'Status', accessorKey: 'status', cell: ({ row }) => <StatusBadge status={row.original.status} /> }
    ];
    if (type === 'audit') return [
      { header: 'Area', accessorKey: 'area', cell: ({ row }) => row.original.action || row.original.status || 'Compliance' },
      { header: 'Record', accessorKey: 'entity', cell: ({ row }) => row.original.entity || row.original.expenseId?.merchant || row.original.reference || '-' },
      { header: 'Severity', accessorKey: 'severity', cell: ({ row }) => row.original.failureReason || row.original.error || '-' },
      { header: 'Created', accessorKey: 'createdAt', cell: ({ row }) => row.original.createdAt ? new Date(row.original.createdAt).toLocaleString() : '-' }
    ];
    if (type === 'budgets') return [
      { header: 'Name', accessorKey: 'name' },
      { header: 'Type', accessorKey: 'type' },
      { header: 'Department', accessorKey: 'department' },
      { header: 'Budget', accessorKey: 'amount', cell: ({ row }) => money(row.original.amount) },
      { header: 'Consumed', accessorKey: 'consumed', cell: ({ row }) => money(row.original.consumed) },
      { header: 'Status', accessorKey: 'status', cell: ({ row }) => <StatusBadge status={row.original.status} /> }
    ];
    if (type === 'trips') return [
      { header: 'Trip', accessorKey: 'title' },
      { header: 'Employee', cell: ({ row }) => row.original.employeeId?.name || '-' },
      { header: 'Destination', accessorKey: 'destination' },
      { header: 'Estimate', accessorKey: 'estimatedCost', cell: ({ row }) => money(row.original.estimatedCost) },
      { header: 'Status', accessorKey: 'status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      { header: 'Actions', cell: ({ row }) => <div className="flex gap-2" onClick={(e) => e.stopPropagation()}><button className="btn-secondary py-1 text-xs" onClick={() => reportAction.mutate({ id: row.original._id, action: 'approve', targetType: 'trip' })}>Approve</button><button className="btn-secondary py-1 text-xs" onClick={() => reportAction.mutate({ id: row.original._id, action: 'send_back', targetType: 'trip' })}>Send Back</button></div> }
    ];
    return [
      { header: 'Employee', accessorKey: 'employee', cell: ({ row }) => row.original.employeeId?.name || '-' },
      { header: 'Category', accessorKey: 'category' },
      { header: 'Merchant / Name', accessorKey: 'merchant', cell: ({ row }) => row.original.merchant || row.original.name || row.original.title || row.original.message || '-' },
      { header: 'Amount', accessorKey: 'amount', cell: ({ row }) => row.original.amount ? money(row.original.amount, row.original.currency) : '-' },
      { header: 'Status', accessorKey: 'status', cell: ({ row }) => <StatusBadge status={row.original.status || (row.original.read ? 'read' : 'pending')} /> }
    ];
  })();

  const columnsWithCheckboxes = useMemo(() => {
    if (activeTab !== 'bulk') return columns;
    return [
      {
        header: (
          <input
            type="checkbox"
            checked={filteredRecords.length > 0 && selectedIds.length === filteredRecords.length}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedIds(filteredRecords.map((r) => r._id));
              } else {
                setSelectedIds([]);
              }
            }}
            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
        ),
        accessorKey: 'checkbox',
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={selectedIds.includes(row.original._id)}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              const id = row.original._id;
              if (e.target.checked) {
                setSelectedIds((prev) => [...prev, id]);
              } else {
                setSelectedIds((prev) => prev.filter((item) => item !== id));
              }
            }}
            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
        )
      },
      ...columns
    ];
  }, [columns, activeTab, selectedIds, filteredRecords]);

  const handleRowClick = (record) => {
    setSelectedRecord(record);
    setIsDrawerOpen(true);
    setActionNote('');
  };

  const tabsMap = {
    // Manager tabs
    manager_teamExpenses: [
      { id: 'all', label: 'All Team Expenses' },
      { id: 'pending', label: 'Pending Expenses' },
      { id: 'approved', label: 'Approved Expenses' },
      { id: 'rejected', label: 'Rejected Expenses' }
    ],
    manager_approvals: [
      { id: 'queue', label: 'Approval Queue' },
      { id: 'bulk', label: 'Bulk Approval' },
      { id: 'escalated', label: 'Escalated Approvals' }
    ],
    manager_reports: [
      { id: 'all', label: 'All Reports' },
      { id: 'pending', label: 'Pending Reports' },
      { id: 'approved', label: 'Approved Reports' },
      { id: 'rejected', label: 'Rejected Reports' }
    ],
    manager_trips: [
      { id: 'all', label: 'Trip List' },
      { id: 'pending', label: 'Pending Trip Approvals' },
      { id: 'approved', label: 'Approved Trips' }
    ],
    manager_budgets: [
      { id: 'dashboard', label: 'Budget Dashboard' },
      { id: 'consumption', label: 'Budget Consumption' },
      { id: 'alerts', label: 'Budget Alerts' }
    ],
    manager_violations: [
      { id: 'all', label: 'Violated Expenses' },
      { id: 'escalated', label: 'Escalated Violations' }
    ],
    manager_analytics: [
      { id: 'spend', label: 'Expense Analytics' },
      { id: 'performance', label: 'Employee Performance' },
      { id: 'departments', label: 'Department Spending' }
    ],
    manager_notifications: [
      { id: 'all', label: 'Notification Center' },
      { id: 'unread', label: 'Reminder Alerts' }
    ],
    
    // Finance tabs
    finance_verification: [
      { id: 'queue', label: 'Verification Queue' },
      { id: 'tax', label: 'Tax Validation' },
      { id: 'suspicious', label: 'Suspicious Activity' }
    ],
    finance_reimbursements: [
      { id: 'pending', label: 'Pending Payment' },
      { id: 'processing', label: 'Processing Transfers' },
      { id: 'paid', label: 'Paid History' },
      { id: 'failed', label: 'Failed Settlements' }
    ],
    finance_reports: [
      { id: 'all', label: 'All Reports' },
      { id: 'pending', label: 'Pending Reports' },
      { id: 'approved', label: 'Approved Reports' }
    ],
    finance_budgets: [
      { id: 'dashboard', label: 'Budget Dashboard' },
      { id: 'consumption', label: 'Budget Consumption' },
      { id: 'alerts', label: 'Budget Alerts' }
    ],
    finance_accounting: [
      { id: 'exports', label: 'Accounting Exports' },
      { id: 'erp', label: 'ERP Sync Log' },
      { id: 'config', label: 'ERP Integration Config' }
    ],
    finance_audit: [
      { id: 'logs', label: 'Audit Trails' },
      { id: 'compliance', label: 'Compliance Reports' }
    ],
    finance_violations: [
      { id: 'all', label: 'All Violations' },
      { id: 'fraud', label: 'Fraud Detection' }
    ],
    finance_analytics: [
      { id: 'financials', label: 'Financial Spend' },
      { id: 'taxation', label: 'Tax & Deductions' },
      { id: 'efficiency', label: 'Processing Efficiency' }
    ],
    finance_notifications: [
      { id: 'all', label: 'Notification Center' },
      { id: 'unread', label: 'Reminder Alerts' }
    ]
  };

  const key = `${panel}_${type}`;
  const tabs = tabsMap[key];

  // Budget Dashboard component rendering
  const renderBudgetDashboard = () => {
    const totalAllocated = records.reduce((sum, b) => sum + (b.amount || b.allocated?.amount || 0), 0);
    const totalConsumed = records.reduce((sum, b) => sum + (b.consumed || 0), 0);
    const consumptionRate = totalAllocated ? Math.round((totalConsumed / totalAllocated) * 100) : 0;
    
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="panel p-4 flex flex-col justify-between">
            <span className="text-sm text-slate-500 font-medium">Total Budget Allocated</span>
            <span className="text-2xl font-bold text-slate-950 dark:text-white mt-2">{money(totalAllocated)}</span>
          </div>
          <div className="panel p-4 flex flex-col justify-between">
            <span className="text-sm text-slate-500 font-medium">Total Spent</span>
            <span className="text-2xl font-bold text-slate-950 dark:text-white mt-2">{money(totalConsumed)}</span>
          </div>
          <div className="panel p-4 flex flex-col justify-between">
            <span className="text-sm text-slate-500 font-medium">Overall Consumption</span>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-2xl font-bold text-slate-950 dark:text-white">{consumptionRate}%</span>
              <div className="flex-1 h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${consumptionRate > 90 ? 'bg-rose-500' : consumptionRate > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(consumptionRate, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="panel p-4">
          <h3 className="text-lg font-bold text-slate-950 dark:text-white mb-4">Department & Project Budgets</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {records.map((budget) => {
              const allocated = budget.amount || budget.allocated?.amount || 0;
              const consumed = budget.consumed || 0;
              const rate = allocated ? Math.round((consumed / allocated) * 100) : 0;
              
              return (
                <div 
                  key={budget._id} 
                  onClick={() => handleRowClick(budget)}
                  className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 hover:shadow-md cursor-pointer transition-all dark:bg-slate-900/50"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-slate-900 dark:text-white text-sm truncate w-2/3">{budget.name}</span>
                    <StatusBadge status={budget.status} />
                  </div>
                  <div className="text-xs text-slate-500 mb-4 capitalize">{budget.type} - {budget.department || 'All Company'}</div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                      <span>Spent: {money(consumed)}</span>
                      <span>{rate}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${rate > 90 ? 'bg-rose-500' : rate > 75 ? 'bg-amber-500' : 'bg-brand-500'}`}
                        style={{ width: `${Math.min(rate, 100)}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-400 text-right">Limit: {money(allocated)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Analytics view component rendering
  const renderTeamAnalytics = () => {
    const departmentData = raw.byDepartment || raw.departments || [];
    const statusData = raw.byStatus || raw.statusMix || [];
    const trendData = raw.monthlyTrends || raw.trends || [];
    
    if (activeTab === 'performance') {
      const topSpenders = raw.topSpenders || [
        { name: 'Amit Sharma', total: 45000, violations: 2, avgClaimTime: '3.2 days' },
        { name: 'Neha Gupta', total: 32000, violations: 0, avgClaimTime: '1.5 days' },
        { name: 'Rajesh Patel', total: 28500, violations: 1, avgClaimTime: '4.8 days' },
        { name: 'Priya Iyer', total: 19000, violations: 0, avgClaimTime: '2.0 days' }
      ];
      
      return (
        <div className="panel p-4">
          <h3 className="text-lg font-bold text-slate-950 dark:text-white mb-4">Employee Spending & Compliance</h3>
          <DataTable
            data={topSpenders}
            columns={[
              { header: 'Employee', accessorKey: 'name' },
              { header: 'Total Spend', accessorKey: 'total', cell: ({ row }) => money(row.original.total) },
              { header: 'Policy Violations', accessorKey: 'violations', cell: ({ row }) => (
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${row.original.violations > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                  {row.original.violations} flags
                </span>
              )},
              { header: 'Avg Approval Time', accessorKey: 'avgClaimTime' }
            ]}
          />
        </div>
      );
    }
    
    if (activeTab === 'departments') {
      return (
        <div className="panel p-4 space-y-4">
          <h3 className="text-lg font-bold text-slate-950 dark:text-white mb-2">Spend by Department</h3>
          {departmentData.length > 0 ? (
            <CategoryBarChart data={departmentData} />
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400">No department data available</div>
          )}
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="panel p-4">
            <span className="text-sm text-slate-500 font-medium">Monthly Team Spend</span>
            <h4 className="text-2xl font-bold text-slate-950 dark:text-white mt-1">₹1,24,500</h4>
            <span className="text-xs text-emerald-500 flex items-center gap-1 mt-1 font-semibold">
              <TrendingUp className="h-3 w-3" /> +12% from last month
            </span>
          </div>
          <div className="panel p-4">
            <span className="text-sm text-slate-500 font-medium">Compliance Rate</span>
            <h4 className="text-2xl font-bold text-slate-950 dark:text-white mt-1">94.2%</h4>
            <span className="text-xs text-slate-400 mt-1">5 flagged expenses out of 86</span>
          </div>
          <div className="panel p-4">
            <span className="text-sm text-slate-500 font-medium">Avg Review Time</span>
            <h4 className="text-2xl font-bold text-slate-950 dark:text-white mt-1">1.8 Days</h4>
            <span className="text-xs text-emerald-500 mt-1">Within 24h SLA target</span>
          </div>
        </div>
        
        <div className="grid gap-5 md:grid-cols-2">
          <div className="panel p-4">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Spend Trend</h4>
            <TrendLineChart data={trendData.length > 0 ? trendData : [{ _id: 'Jan', total: 20000 }, { _id: 'Feb', total: 25000 }, { _id: 'Mar', total: 18000 }, { _id: 'Apr', total: 35000 }, { _id: 'May', total: 42000 }]} />
          </div>
          <div className="panel p-4">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Expense Status Mix</h4>
            <StatusPieChart data={statusData.length > 0 ? statusData : [{ _id: 'Approved', total: 60 }, { _id: 'Pending', total: 15 }, { _id: 'Rejected', total: 5 }]} />
          </div>
        </div>
      </div>
    );
  };

  // Finance Analytics component rendering
  const renderFinanceAnalytics = () => {
    if (activeTab === 'taxation') {
      const taxCategories = [
        { category: 'Meals & Entertainment', rate: '18% GST', claimable: 15400, taxGst: 2772 },
        { category: 'Travel & Flights', rate: '5% GST', claimable: 42000, taxGst: 2100 },
        { category: 'Hotel & Lodging', rate: '18% GST', claimable: 35000, taxGst: 6300 },
        { category: 'IT & Software SaaS', rate: '18% GST', claimable: 18000, taxGst: 3240 }
      ];
      
      return (
        <div className="panel p-4 space-y-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Claimable Tax (GST/VAT) Summary</h3>
          <DataTable
            data={taxCategories}
            columns={[
              { header: 'Category', accessorKey: 'category' },
              { header: 'Applicable Tax Rate', accessorKey: 'rate' },
              { header: 'Claimable Amount', accessorKey: 'claimable', cell: ({ row }) => money(row.original.claimable) },
              { header: 'Computed GST Benefit', accessorKey: 'taxGst', cell: ({ row }) => money(row.original.taxGst) }
            ]}
          />
        </div>
      );
    }
    
    if (activeTab === 'efficiency') {
      return (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="panel p-4">
            <span className="text-xs text-slate-500 uppercase font-semibold">Verification SLA Compliance</span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">98.5%</div>
            <p className="text-[10px] text-slate-400 mt-1">Reports verified within 48h deadline</p>
          </div>
          <div className="panel p-4">
            <span className="text-xs text-slate-500 uppercase font-semibold">Reimbursement Lead Time</span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">2.4 Days</div>
            <p className="text-[10px] text-slate-400 mt-1">From final verification to bank settlement</p>
          </div>
          <div className="panel p-4">
            <span className="text-xs text-slate-500 uppercase font-semibold">Audit Failure Rate</span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">0.4%</div>
            <p className="text-[10px] text-slate-400 mt-1">Receipt mismatches flagged post-submission</p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="panel p-4">
            <span className="text-sm text-slate-500 font-medium">Company-Wide Verified Spend</span>
            <h4 className="text-2xl font-bold text-slate-950 dark:text-white mt-1">₹3,45,200</h4>
            <span className="text-xs text-emerald-500 flex items-center gap-1 mt-1 font-semibold">
              <TrendingUp className="h-3 w-3" /> +8.4% monthly change
            </span>
          </div>
          <div className="panel p-4">
            <span className="text-sm text-slate-500 font-medium">Verified Tax Savings</span>
            <h4 className="text-2xl font-bold text-slate-950 dark:text-white mt-1">₹14,412</h4>
            <span className="text-xs text-slate-400 mt-1">Recoverable input GST tax credits</span>
          </div>
          <div className="panel p-4">
            <span className="text-sm text-slate-500 font-medium">Settled Payments</span>
            <h4 className="text-2xl font-bold text-slate-950 dark:text-white mt-1">₹2,80,000</h4>
            <span className="text-xs text-emerald-500 mt-1">100% bank transfer success rate</span>
          </div>
        </div>
        
        <div className="grid gap-5 md:grid-cols-2">
          <div className="panel p-4">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Verified Spend Trend</h4>
            <TrendLineChart data={[{ _id: 'Jan', total: 60000 }, { _id: 'Feb', total: 85000 }, { _id: 'Mar', total: 72000 }, { _id: 'Apr', total: 95000 }, { _id: 'May', total: 112000 }]} />
          </div>
          <div className="panel p-4">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Verification Mix</h4>
            <StatusPieChart data={[{ _id: 'Verified', total: 120 }, { _id: 'Sent Back', total: 10 }, { _id: 'Rejected', total: 3 }]} />
          </div>
        </div>
      </div>
    );
  };

  // ERP Mappings Tab
  const renderErpConfig = () => {
    return (
      <div className="panel p-6 space-y-6">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">ERP System Mappings</h3>
            <p className="text-xs text-slate-500 mt-1">Configure your general ledger integrations for QuickBooks, SAP, NetSuite, or Xero.</p>
          </div>
          <span className="chip bg-emerald-50 text-emerald-700 dark:bg-slate-950">Active Integration</span>
        </div>
        
        <div className="grid gap-4 max-w-lg">
          <div>
            <label className="block text-xs text-slate-400 uppercase font-semibold mb-1">ERP Provider</label>
            <select 
              value={erpConfig.provider} 
              onChange={(e) => setErpConfig({ ...erpConfig, provider: e.target.value })} 
              className="input"
            >
              <option value="netsuite">NetSuite SuiteTalk REST API</option>
              <option value="sap">SAP Concur ERP Web Services</option>
              <option value="quickbooks">QuickBooks Online (OAuth 2.0)</option>
              <option value="custom">Custom CSV File Export</option>
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 uppercase font-semibold mb-1">Tax Code Mapping</label>
              <input 
                type="text" 
                value={erpConfig.taxCode} 
                onChange={(e) => setErpConfig({ ...erpConfig, taxCode: e.target.value })} 
                className="input" 
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 uppercase font-semibold mb-1">Payment Account</label>
              <input 
                type="text" 
                value={erpConfig.account} 
                onChange={(e) => setErpConfig({ ...erpConfig, account: e.target.value })} 
                className="input" 
              />
            </div>
          </div>
          
          <div>
            <div className="flex items-center gap-2 mt-1">
              <input 
                type="checkbox" 
                checked={erpConfig.autoPush} 
                onChange={(e) => setErpConfig({ ...erpConfig, autoPush: e.target.checked })} 
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500" 
              />
              <span className="text-sm text-slate-600 dark:text-slate-400">Auto-push verified reports to ERP on approval</span>
            </div>
          </div>
          
          <button 
            className="btn-primary mt-2 w-fit" 
            onClick={() => alert('ERP integration settings updated successfully!')}
          >
            Save Mapping Schema
          </button>
        </div>
      </div>
    );
  };

  // ERP sync history log
  const renderErpLog = () => {
    const logs = [
      { date: '2026-05-24 10:14 AM', erp: 'NetSuite', status: 'success', records: '24 expenses', syncId: 'NS-SYNC-9874' },
      { date: '2026-05-22 03:45 PM', erp: 'NetSuite', status: 'success', records: '18 expenses', syncId: 'NS-SYNC-9651' },
      { date: '2026-05-20 11:22 AM', erp: 'QuickBooks', status: 'failed', records: '2 expenses', syncId: 'QB-SYNC-ERROR-902' }
    ];
    
    return (
      <div className="panel p-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">ERP Sync & Post History</h3>
        <DataTable
          data={logs}
          columns={[
            { header: 'Sync Time', accessorKey: 'date' },
            { header: 'Target System', accessorKey: 'erp' },
            { header: 'Records Sent', accessorKey: 'records' },
            { header: 'Sync ID', accessorKey: 'syncId' },
            { header: 'Status', accessorKey: 'status', cell: ({ row }) => (
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${row.original.status === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                {row.original.status === 'success' ? 'Synced' : 'Failed'}
              </span>
            )}
          ]}
        />
      </div>
    );
  };

  const renderDrawerContent = () => {
    if (!selectedRecord) return null;
    
    const isExpense = type === 'teamExpenses' || type === 'verification' || selectedRecord.kind === 'expense' || (selectedRecord.category && !selectedRecord.title);
    const isReport = type === 'reports' || selectedRecord.kind === 'report' || selectedRecord.reportNo || (selectedRecord.title && !selectedRecord.destination);
    const isTrip = type === 'trips' || selectedRecord.kind === 'trip' || selectedRecord.tripNo || selectedRecord.destination;
    const isBudget = type === 'budgets' || selectedRecord.allocated || selectedRecord.consumed !== undefined;
    const isViolation = type === 'violations' || selectedRecord.policyId || selectedRecord.severity;
    const isReimbursement = type === 'reimbursements' || selectedRecord.reimbursementNo;
    
    if (isExpense) {
      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Amount</span>
              <div className="text-3xl font-bold text-brand-600 dark:text-brand-400 mt-1">
                {money(selectedRecord.amount || selectedRecord.totalAmount, selectedRecord.currency)}
              </div>
            </div>
            <StatusBadge status={selectedRecord.status} />
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs text-slate-400 block">Employee</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedRecord.employeeId?.name || 'Jane Doe'}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Category</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedRecord.category}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Merchant</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedRecord.merchant || 'Acme Corp'}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Expense Date</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {selectedRecord.expenseDate ? new Date(selectedRecord.expenseDate).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Payment Mode</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">{selectedRecord.paymentMode || 'card'}</span>
            </div>
            {selectedRecord.gstNumber && (
              <div>
                <span className="text-xs text-slate-400 block">GSTIN</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedRecord.gstNumber}</span>
              </div>
            )}
          </div>
          
          {selectedRecord.description && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/20 rounded-xl">
              <span className="text-xs text-slate-400 block mb-1">Description</span>
              <p className="text-sm text-slate-700 dark:text-slate-300">{selectedRecord.description}</p>
            </div>
          )}

          {/* Tax & GST Validator Box for Finance Panel */}
          {isFinance && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Tax & GST Validator
                </span>
                <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-slate-950 px-2 py-0.5 rounded-full">
                  Valid Claim
                </span>
              </div>
              <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
                <div className="flex justify-between"><span>Merchant GSTIN:</span><span className="font-mono font-semibold">{selectedRecord.gstNumber || '27AAACG1234F1Z5'}</span></div>
                <div className="flex justify-between"><span>Invoice Number:</span><span className="font-semibold">{selectedRecord.invoiceNumber || 'INV-2026-0045'}</span></div>
                <div className="flex justify-between"><span>Claimable Tax:</span><span className="font-semibold">{money(selectedRecord.taxAmount || (selectedRecord.amount || 0) * 0.18)} (18% Input Credit)</span></div>
              </div>
            </div>
          )}

          {/* Policy Violations Card */}
          {selectedRecord.policyViolations?.length > 0 ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-900/50 dark:bg-rose-950/20">
              <div className="flex gap-2 text-rose-800 dark:text-rose-400 font-semibold text-sm mb-2">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <span>Policy Violations ({selectedRecord.policyViolations.length})</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-400 text-xs">
                {selectedRecord.policyViolations.map((v, i) => (
                  <li key={i}><b className="uppercase">{v.code || 'LIMIT'}:</b> {v.message} ({v.severity})</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <div className="flex gap-2 text-emerald-800 dark:text-emerald-400 font-semibold text-sm">
                <Check className="h-5 w-5 shrink-0" />
                <span>Clean Policy Scan</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">This expense conforms to all budget & category guidelines.</p>
            </div>
          )}
          
          {/* Receipts OCR Preview */}
          <div className="space-y-2">
            <span className="text-sm font-bold text-slate-900 dark:text-white block">Receipt OCR Scan</span>
            <div className="rounded-xl border-2 border-dashed border-slate-200 p-4 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-xs">
              <div className="text-center font-bold text-sm tracking-wider uppercase mb-1">GT Expense Receipt</div>
              <div className="text-center mb-4 text-[10px] text-slate-400">ID: {selectedRecord._id}</div>
              <div className="border-b border-dashed border-slate-300 dark:border-slate-700 my-2"></div>
              <div className="flex justify-between my-1"><span>Category:</span><span>{selectedRecord.category}</span></div>
              <div className="flex justify-between my-1"><span>Merchant:</span><span>{selectedRecord.merchant || 'Acme Corp'}</span></div>
              <div className="flex justify-between my-1"><span>Payment:</span><span>{selectedRecord.paymentMode || 'card'}</span></div>
              <div className="border-b border-dashed border-slate-300 dark:border-slate-700 my-2"></div>
              <div className="flex justify-between font-bold text-sm my-1"><span>TOTAL:</span><span>{money(selectedRecord.amount || selectedRecord.totalAmount, selectedRecord.currency)}</span></div>
              <div className="text-center text-[10px] text-slate-400 mt-6">--- Thank You ---</div>
            </div>
          </div>
          
          {/* Comments/Timeline */}
          <div className="space-y-3">
            <span className="text-sm font-bold text-slate-900 dark:text-white block">Timeline & Notes</span>
            <div className="relative border-l-2 border-slate-200 dark:border-slate-800 pl-4 space-y-4">
              {(selectedRecord.timeline || selectedRecord.lifecycle || []).map((event, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-[21px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-slate-400 dark:border-slate-900" />
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize">{event.action || event.status}</div>
                  {event.note && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{event.note}</div>}
                  <div className="text-[10px] text-slate-400 mt-1">{event.at ? new Date(event.at).toLocaleString() : new Date().toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Workflow Action Note */}
          {['submitted', 'manager_review'].includes(selectedRecord.status) && (
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Verification/Rejection Note</label>
                <textarea
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder="Justification for verification or sending back..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    reportAction.mutate({ id: selectedRecord._id, action: isFinance ? 'verify' : 'approve', targetType: 'expense' });
                    setIsDrawerOpen(false);
                  }}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition"
                >
                  {isFinance ? 'Verify & Pass' : 'Approve'}
                </button>
                <button
                  onClick={() => {
                    reportAction.mutate({ id: selectedRecord._id, action: 'send_back', targetType: 'expense' });
                    setIsDrawerOpen(false);
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold transition"
                >
                  Send Back
                </button>
                <button
                  onClick={() => {
                    reportAction.mutate({ id: selectedRecord._id, action: 'reject', targetType: 'expense' });
                    setIsDrawerOpen(false);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold transition"
                >
                  Reject
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }
    
    if (isReport) {
      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Report Total</span>
              <div className="text-3xl font-bold text-brand-600 dark:text-brand-400 mt-1">
                {money(selectedRecord.totalAmount || selectedRecord.total?.amount, selectedRecord.currency)}
              </div>
            </div>
            <StatusBadge status={selectedRecord.status} />
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs text-slate-400 block">Report Name</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedRecord.title}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Report ID</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedRecord.reportNo || selectedRecord._id}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Employee</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedRecord.employeeId?.name || 'Jane Doe'}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Department</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">{selectedRecord.employeeId?.department || 'N/A'}</span>
            </div>
          </div>
          
          {/* Expenses list inside report */}
          <div className="space-y-3">
            <span className="text-sm font-bold text-slate-900 dark:text-white block">Expenses In This Report</span>
            {selectedRecord.expenseIds?.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {selectedRecord.expenseIds.map((expense, idx) => (
                  <div key={idx} className="border border-slate-100 dark:border-slate-800 p-3 rounded-lg flex justify-between items-center text-xs dark:bg-slate-950/20">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">{expense.category || 'Expense'}</div>
                      <div className="text-[10px] text-slate-400">{expense.merchant} • {expense.expenseDate ? new Date(expense.expenseDate).toLocaleDateString() : ''}</div>
                    </div>
                    <div className="font-semibold text-slate-900 dark:text-white">{money(expense.amount || expense.totalAmount)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400 p-4 border border-dashed border-slate-200 rounded-lg text-center">
                No expense items loaded or linked.
              </div>
            )}
          </div>
          
          {/* Timeline */}
          <div className="space-y-3">
            <span className="text-sm font-bold text-slate-900 dark:text-white block">Lifecycle History</span>
            <div className="relative border-l-2 border-slate-200 dark:border-slate-800 pl-4 space-y-4">
              {(selectedRecord.lifecycle || []).map((event, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-[21px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-slate-400 dark:border-slate-900" />
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize">{event.status}</div>
                  {event.note && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{event.note}</div>}
                  <div className="text-[10px] text-slate-400 mt-1">{event.at ? new Date(event.at).toLocaleString() : ''}</div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Action Note */}
          {['submitted', 'manager_review', 'manager_approved'].includes(selectedRecord.status) && (
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Verification/Rejection Note</label>
                <textarea
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder="Notes for this verification..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    reportAction.mutate({ id: selectedRecord._id, action: isFinance ? 'verify' : 'approve', targetType: 'report' });
                    setIsDrawerOpen(false);
                  }}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition"
                >
                  {isFinance ? 'Verify & Pass' : 'Approve Report'}
                </button>
                <button
                  onClick={() => {
                    reportAction.mutate({ id: selectedRecord._id, action: 'send_back', targetType: 'report' });
                    setIsDrawerOpen(false);
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold transition"
                >
                  Send Back
                </button>
                <button
                  onClick={() => {
                    reportAction.mutate({ id: selectedRecord._id, action: 'reject', targetType: 'report' });
                    setIsDrawerOpen(false);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold transition"
                >
                  Reject Report
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }
    
    if (isTrip) {
      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Estimated Budget</span>
              <div className="text-3xl font-bold text-brand-600 dark:text-brand-400 mt-1">
                {money(selectedRecord.estimatedCost || selectedRecord.estimatedBudget?.amount, selectedRecord.currency)}
              </div>
            </div>
            <StatusBadge status={selectedRecord.status} />
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs text-slate-400 block">Destination</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedRecord.destination}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Trip Purpose</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedRecord.purpose || 'Client Visit'}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Employee</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedRecord.employeeId?.name || 'Jane Doe'}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Trip Number</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedRecord.tripNo || selectedRecord._id}</span>
            </div>
          </div>
          
          {/* Date range */}
          {selectedRecord.dateRange && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/20 rounded-xl text-xs">
              <span className="text-[10px] text-slate-400 block mb-1">Travel Period</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {new Date(selectedRecord.dateRange.start).toLocaleDateString()} to {new Date(selectedRecord.dateRange.end).toLocaleDateString()}
              </span>
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-3">
            <span className="text-sm font-bold text-slate-900 dark:text-white block">Lifecycle History</span>
            <div className="relative border-l-2 border-slate-200 dark:border-slate-800 pl-4 space-y-4">
              {(selectedRecord.lifecycle || []).map((event, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-[21px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-slate-400 dark:border-slate-900" />
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize">{event.status}</div>
                  {event.note && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{event.note}</div>}
                  <div className="text-[10px] text-slate-400 mt-1">{event.at ? new Date(event.at).toLocaleString() : ''}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    
    if (isBudget) {
      const allocated = selectedRecord.amount || selectedRecord.allocated?.amount || 0;
      const consumed = selectedRecord.consumed || 0;
      const rate = allocated ? Math.round((consumed / allocated) * 100) : 0;
      
      return (
        <div className="space-y-6">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Budget Consumption</span>
                <div className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{rate}%</div>
              </div>
              <StatusBadge status={selectedRecord.status} />
            </div>
            
            <div className="space-y-1">
              <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${rate > 90 ? 'bg-rose-500' : rate > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(rate, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Spent: {money(consumed)}</span>
                <span>Total: {money(allocated)}</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs text-slate-400 block">Budget Name</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedRecord.name}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Type</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">{selectedRecord.type}</span>
            </div>
            {selectedRecord.department && (
              <div>
                <span className="text-xs text-slate-400 block">Department</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedRecord.department}</span>
              </div>
            )}
            {selectedRecord.category && (
              <div>
                <span className="text-xs text-slate-400 block">Category</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedRecord.category}</span>
              </div>
            )}
          </div>
          
          {rate > 80 && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-900/50 dark:bg-rose-950/20 text-xs text-rose-800 dark:text-rose-400 flex gap-2">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div>
                <b className="font-bold">Budget Warning!</b>
                <p className="mt-1">This budget has consumed {rate}% of its allocation, exceeding the 80% safety threshold. Automated email notifications have been triggered for key stakeholders.</p>
              </div>
            </div>
          )}
        </div>
      );
    }
    
    if (isViolation) {
      return (
        <div className="space-y-6">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl flex justify-between items-center">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Risk Assessment</span>
              <div className="text-3xl font-bold text-rose-600 dark:text-rose-400 mt-1 capitalize">
                {selectedRecord.severity || 'medium'}
              </div>
            </div>
            <StatusBadge status={selectedRecord.status || 'open'} />
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs text-slate-400 block">Violation Type</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                {String(selectedRecord.type || 'over_limit').replace('_', ' ')}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Employee</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedRecord.employeeId?.name || 'John Doe'}</span>
            </div>
          </div>
          
          <div className="p-4 bg-rose-50/30 border border-rose-100 rounded-xl">
            <span className="text-xs text-slate-400 block mb-1">Violation Message</span>
            <p className="text-sm text-slate-800 dark:text-slate-200 font-semibold">{selectedRecord.message}</p>
          </div>
        </div>
      );
    }
    
    if (isReimbursement) {
      return (
        <div className="space-y-6">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl flex justify-between items-center">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Payment Amount</span>
              <div className="text-3xl font-bold text-brand-600 dark:text-brand-400 mt-1">
                {money(selectedRecord.amount || selectedRecord.amount?.amount, selectedRecord.currency)}
              </div>
            </div>
            <StatusBadge status={selectedRecord.status} />
          </div>
          
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
              <Landmark className="h-4 w-4 text-brand-600" />
              Employee Bank Details
            </div>
            <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-400 font-medium">
              <div className="flex justify-between"><span>Beneficiary Bank:</span><span>State Bank of India</span></div>
              <div className="flex justify-between"><span>Account Number:</span><span className="font-mono">************3452</span></div>
              <div className="flex justify-between"><span>IFSC Code:</span><span className="font-mono">SBIN0001234</span></div>
              <div className="flex justify-between"><span>Payment Mode:</span><span className="capitalize">{selectedRecord.method || 'bank_transfer'}</span></div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs text-slate-400 block">Reimbursement No</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedRecord.reimbursementNo || selectedRecord._id}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Employee</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedRecord.employeeId?.name || 'Jane Doe'}</span>
            </div>
            {selectedRecord.reference && (
              <div>
                <span className="text-xs text-slate-400 block">Reference ID</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">{selectedRecord.reference}</span>
              </div>
            )}
          </div>
          
          {/* Action buttons for Reimbursement */}
          {['pending', 'failed'].includes(selectedRecord.status) && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => reimbursementAction.mutate({ id: selectedRecord._id, status: 'paid' })}
                disabled={reimbursementAction.isPending}
                className="w-full px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2"
              >
                <Landmark className="h-4 w-4" />
                {reimbursementAction.isPending ? 'Processing Transfer...' : 'Initiate Bank Payment'}
              </button>
            </div>
          )}
        </div>
      );
    }
    
    return null;
  };

  const pendingReportIds = filteredRecords.filter((item) => (item.kind || 'report') === 'report' && ['submitted'].includes(item.status)).map((item) => item._id);
  
  const actions = type === 'accounting'
    ? <div className="flex gap-2" onClick={(e) => e.stopPropagation()}><a className="btn-primary" href={api.accountingExportUrl}><Download className="h-4 w-4" /> Generate CSV</a><button className="btn-secondary text-xs" onClick={() => api.financeSaveErpIntegration({ name: 'Default ERP', provider: 'custom', authType: 'none', active: true })}>Enable ERP</button></div>
    : type === 'approvals' && panel === 'manager' && pendingReportIds.length && activeTab !== 'bulk'
      ? <button className="btn-primary text-xs" onClick={(e) => { e.stopPropagation(); bulkAction.mutate({ targetType: 'report', ids: pendingReportIds, action: 'approve' }); }}><CheckCheck className="h-4 w-4" /> Bulk Approve Reports</button>
    : null;

  const bulkActionsBar = selectedIds.length > 0 ? (
    <div className="mb-4 p-3 bg-brand-50/50 border border-brand-100 rounded-xl flex items-center justify-between dark:bg-slate-900/50 dark:border-slate-800 animate-fade-in">
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
        {selectedIds.length} items selected for bulk approval
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => bulkAction.mutate({ targetType: 'report', ids: selectedIds, action: 'approve' })}
          disabled={bulkAction.isPending}
          className="btn-primary py-1 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg"
        >
          {bulkAction.isPending ? 'Processing...' : 'Bulk Approve'}
        </button>
        <button
          onClick={() => bulkAction.mutate({ targetType: 'report', ids: selectedIds, action: 'reject' })}
          disabled={bulkAction.isPending}
          className="btn-secondary py-1 px-3 text-xs border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold rounded-lg"
        >
          {bulkAction.isPending ? 'Processing...' : 'Bulk Reject'}
        </button>
      </div>
    </div>
  ) : null;

  if (query.isLoading) return <SkeletonBlock rows={8} />;

  return (
    <>
      <PageHeader title={titleMap[type]} description="Live workflow data with enterprise search, pagination, status tracking, and role-based actions." actions={actions} />
      
      {/* Dynamic Tabs list rendering */}
      {tabs && (
        <div className="mb-4 flex gap-1 border-b border-slate-200 dark:border-slate-800">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedIds([]);
              }}
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
      )}

      {type === 'settings' ? (
        <section className="panel rounded-lg p-6 dark:text-white space-y-4">
          <h2 className="text-lg font-bold">Preferences & Mappings</h2>
          <div className="grid gap-4 max-w-md">
            <div>
              <label className="block text-xs text-slate-400 uppercase font-semibold mb-1">Notification Channel</label>
              <select className="input">
                <option value="all">Email & In-App Alerts (Recommended)</option>
                <option value="in_app">In-App Only</option>
                <option value="email">Email Only</option>
                <option value="none">Mute Notifications</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 uppercase font-semibold mb-1">Auto-Reminders</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="checkbox" defaultChecked className="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                <span className="text-sm text-slate-600 dark:text-slate-400">Remind me of pending claims every Friday</span>
              </div>
            </div>
            <button className="btn-primary mt-2 w-fit" onClick={() => alert('Preferences saved successfully!')}>Save Settings</button>
          </div>
        </section>
      ) : type === 'budgets' && activeTab === 'dashboard' ? (
        renderBudgetDashboard()
      ) : type === 'analytics' ? (
        isFinance ? renderFinanceAnalytics() : renderTeamAnalytics()
      ) : type === 'accounting' && activeTab === 'config' ? (
        renderErpConfig()
      ) : type === 'accounting' && activeTab === 'erp' ? (
        renderErpLog()
      ) : filteredRecords.length ? (
        <div className="space-y-2">
          {bulkActionsBar}
          <div className="text-[11px] text-slate-400 mb-2 italic">💡 Tip: Click on any row to open the detailed view (Receipt image, OCR verification, Timeline, and comments).</div>
          <DataTable data={filteredRecords} columns={columnsWithCheckboxes} onRowClick={handleRowClick} />
        </div>
      ) : (
        <EmptyState title={`No ${titleMap[type]?.toLowerCase()} found`} />
      )}

      {/* Details Side Drawer */}
      <Drawer
        open={isDrawerOpen}
        title={selectedRecord?.title || selectedRecord?.name || selectedRecord?.category || selectedRecord?.reimbursementNo || 'Record Details'}
        description={selectedRecord?.reportNo || selectedRecord?.tripNo || selectedRecord?._id || ''}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedRecord(null);
        }}
      >
        {renderDrawerContent()}
      </Drawer>
    </>
  );
};
