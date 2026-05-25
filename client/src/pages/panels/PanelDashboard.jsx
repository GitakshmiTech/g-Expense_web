import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Banknote, CheckCircle2, Clock3, IndianRupee, WalletCards } from 'lucide-react';
import { CategoryBarChart, StatusPieChart } from '../../components/charts/ExpenseCharts';
import { PageHeader } from '../../components/common/PageHeader';
import { SkeletonBlock } from '../../components/common/SkeletonBlock';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { DataTable } from '../../components/tables/DataTable';
import { api } from '../../services/platform.service';

const money = (value) => `₹${Math.round(Number(value || 0)).toLocaleString()}`;

export const PanelDashboard = ({ panel }) => {
  const queryClient = useQueryClient();
  const isFinance = panel === 'finance';
  const dashboard = useQuery({
    queryKey: [panel, 'dashboard'],
    queryFn: isFinance ? api.financeBusinessDashboard : api.managerBusinessDashboard
  });
  const action = useMutation({
    mutationFn: ({ id, payload }) => isFinance ? api.financeVerificationAction({ reportId: id, ...payload }) : api.managerApprovalAction({ targetType: 'report', id, ...payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [panel, 'dashboard'] })
  });

  if (dashboard.isLoading) return <SkeletonBlock rows={8} />;
  const data = dashboard.data || {};
  const reports = data.reports || [];

  return (
    <>
      <PageHeader
        title={isFinance ? 'Finance Command Center' : 'Manager Command Center'}
        description={isFinance ? 'Verify taxes, receipts, reimbursement readiness, exports, and compliance risk.' : 'Review team spend, approval SLA, policy violations, budgets, and trip activity.'}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label={isFinance ? 'Verification Queue' : 'Total Spend'} value={isFinance ? data.cards?.verificationQueue || 0 : money(data.cards?.totalSpend)} icon={IndianRupee} />
        <StatCard label={isFinance ? 'Tax Issues' : 'Pending Approvals'} value={isFinance ? data.cards?.taxIssues || 0 : data.cards?.pendingApprovals || 0} icon={Clock3} tone="amber" />
        <StatCard label={isFinance ? 'Suspicious Expenses' : 'Policy / Fraud Flags'} value={isFinance ? data.cards?.suspiciousExpenses || 0 : data.cards?.policyViolations || 0} icon={AlertTriangle} tone="rose" />
        <StatCard label={isFinance ? 'Pending Reimbursement' : 'Budget Consumed'} value={money(isFinance ? data.cards?.pendingReimbursement : data.cards?.budgetConsumed)} icon={isFinance ? Banknote : WalletCards} tone="green" />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_420px]">
        <section className="panel rounded-lg p-4">
          <h2 className="mb-3 font-bold dark:text-white">{isFinance ? 'Expense Verification Queue' : 'Pending Team Reports'}</h2>
          <DataTable
            data={isFinance ? data.verificationQueue || [] : reports}
            columns={[
              { header: 'Report', accessorKey: 'title' },
              { header: 'Employee', accessorKey: 'employeeId.name', cell: ({ row }) => row.original.employeeId?.name || '-' },
              { header: 'Amount', accessorKey: 'totalAmount', cell: ({ row }) => money(row.original.totalAmount) },
              { header: 'Status', accessorKey: 'status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
              {
                header: 'Actions',
                accessorKey: '_id',
                cell: ({ row }) => (
                  <div className="flex gap-2">
                    <button className="btn-secondary py-1" onClick={() => action.mutate({ id: row.original._id, payload: { action: isFinance ? 'verify' : 'approve', note: 'Approved from panel' } })}>
                      <CheckCircle2 className="h-4 w-4" /> {isFinance ? 'Verify' : 'Approve'}
                    </button>
                    <button className="btn-secondary py-1" onClick={() => action.mutate({ id: row.original._id, payload: { action: 'send_back', note: 'Needs clarification' } })}>Send Back</button>
                  </div>
                )
              }
            ]}
          />
        </section>
        <div className="grid gap-5">
          <section className="panel rounded-lg p-4"><h2 className="mb-3 font-bold dark:text-white">{isFinance ? 'Status Mix' : 'Top Spenders'}</h2><StatusPieChart data={data.charts?.byStatus || data.charts?.topSpenders || []} /></section>
          <section className="panel rounded-lg p-4"><h2 className="mb-3 font-bold dark:text-white">{isFinance ? 'Department Spend' : 'Monthly Trends'}</h2><CategoryBarChart data={data.charts?.byDepartment || data.charts?.monthlyTrends || []} /></section>
        </div>
      </div>
    </>
  );
};
