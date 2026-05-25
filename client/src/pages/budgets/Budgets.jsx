import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, WalletCards } from 'lucide-react';
import { AnalyticsCard } from '../../components/common/AnalyticsCard';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { DataTable } from '../../components/tables/DataTable';
import { api } from '../../services/platform.service';

export const Budgets = () => {
  const queryClient = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ['budgets'], queryFn: api.budgets });
  const create = useMutation({ mutationFn: api.createBudget, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budgets'] }) });
  const total = data.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const consumed = data.reduce((sum, item) => sum + Number(item.consumed || 0), 0);
  return (
    <>
      <PageHeader title="Budget Dashboard" description="Department and project budgets with threshold alerts." actions={<button className="btn-primary" onClick={() => create.mutate({ name: 'Sales Project Budget', type: 'project', projectCode: 'SALES-Q2', amount: 250000, consumed: 0 })}><Plus className="h-4 w-4" /> Add Budget</button>} />
      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <StatCard label="Allocated" value={`₹${Math.round(total).toLocaleString()}`} icon={WalletCards} />
        <StatCard label="Consumed" value={`₹${Math.round(consumed).toLocaleString()}`} icon={WalletCards} tone="amber" />
        <StatCard label="Remaining" value={`₹${Math.round(total - consumed).toLocaleString()}`} icon={WalletCards} tone="green" />
      </div>
      <AnalyticsCard title="Consumption Overview" value={`${Math.round((consumed / (total || 1)) * 100)}%`} caption="Budget utilization across departments and projects.">
        <div className="h-4 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.min((consumed / (total || 1)) * 100, 100)}%` }} /></div>
      </AnalyticsCard>
      <div className="mt-5">
        <DataTable data={data} columns={[{ header: 'Budget', accessorKey: 'name' }, { header: 'Type', accessorKey: 'type' }, { header: 'Amount', accessorKey: 'amount' }, { header: 'Consumed', accessorKey: 'consumed' }, { header: 'Usage', cell: ({ row }) => `${Math.round(((row.original.consumed || 0) / (row.original.amount || 1)) * 100)}%` }]} />
      </div>
    </>
  );
};
