import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, WalletCards, X } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { AnalyticsCard } from '../../components/common/AnalyticsCard';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { DataTable } from '../../components/tables/DataTable';
import { api } from '../../services/platform.service';
import { usePermission } from '../../hooks/usePermissions';

const budgetDefaults = {
  name: '',
  type: 'department',
  department: '',
  projectCode: '',
  amount: '',
  consumed: 0,
  status: 'active'
};

const BudgetDrawer = ({ onClose, onSubmit, isSaving, departments = [] }) => {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({ defaultValues: budgetDefaults });
  const type = watch('type');

  const submit = (values) => {
    const amount = Number(values.amount || 0);
    if (!amount) return;
    onSubmit({
      name: values.name.trim(),
      type: values.type,
      department: values.type === 'department' ? values.department.trim() : '',
      projectCode: values.type === 'project' ? values.projectCode.trim() : '',
      amount,
      consumed: Number(values.consumed || 0),
      status: values.status
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30 backdrop-blur-sm">
      <form onSubmit={handleSubmit(submit)} className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold dark:text-white">Create Budget</h2>
            <p className="text-sm text-slate-500">Add department or project allocation with live tracking.</p>
          </div>
          <button type="button" className="btn-secondary px-2" onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <div className="grid flex-1 content-start gap-4 overflow-y-auto p-5 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200 sm:col-span-2">
            <span>Budget Name</span>
            <input className="input" {...register('name', { required: true })} />
            {errors.name && <span className="text-xs text-rose-600">Budget name is required.</span>}
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
            <span>Type</span>
            <select className="input" {...register('type')}>
              <option value="department">Department</option>
              <option value="project">Project</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
            <span>Status</span>
            <select className="input" {...register('status')}>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
          </label>
          {type === 'department' ? (
            <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
              <span>Department</span>
              <select className="input" {...register('department', { required: true })}>
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept.name}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
              <span>Project Code</span>
              <input className="input" placeholder="SALES-Q2" {...register('projectCode')} />
            </label>
          )}
          <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
            <span>Allocated Amount</span>
            <input className="input" type="number" min="1" {...register('amount', { required: true, min: 1 })} />
            {errors.amount && <span className="text-xs text-rose-600">Enter a valid amount.</span>}
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
            <span>Consumed</span>
            <input className="input" type="number" min="0" {...register('consumed')} />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 p-5 dark:border-slate-800">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
};

export const Budgets = () => {
  const queryClient = useQueryClient();
  const canCreate = usePermission('budgets', 'create');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data = [] } = useQuery({ queryKey: ['budgets'], queryFn: api.budgets });
  const { data: departmentData } = useQuery({
    queryKey: ['enterprise', 'departments'],
    queryFn: () => api.enterpriseList('departments', { limit: 200 })
  });
  const departments = departmentData?.items || [];
  const create = useMutation({
    mutationFn: api.createBudget,
    onSuccess: () => {
      setDrawerOpen(false);
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    }
  });
  const total = data.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const consumed = data.reduce((sum, item) => sum + Number(item.consumed || 0), 0);
  return (
    <>
      <PageHeader title="Budget Dashboard" description="Department and project budgets with threshold alerts." actions={canCreate && <button className="btn-primary" onClick={() => setDrawerOpen(true)}><Plus className="h-4 w-4" /> Add Budget</button>} />
      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <StatCard label="Allocated" value={`₹${Math.round(total).toLocaleString()}`} icon={WalletCards} />
        <StatCard label="Consumed" value={`₹${Math.round(consumed).toLocaleString()}`} icon={WalletCards} tone="amber" />
        <StatCard label="Remaining" value={`₹${Math.round(total - consumed).toLocaleString()}`} icon={WalletCards} tone="green" />
      </div>
      <AnalyticsCard title="Consumption Overview" value={`${Math.round((consumed / (total || 1)) * 100)}%`} caption="Budget utilization across departments and projects.">
        <div className="h-4 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.min((consumed / (total || 1)) * 100, 100)}%` }} /></div>
      </AnalyticsCard>
      <div className="mt-5">
        <DataTable data={data} columns={[{ header: 'Budget', accessorKey: 'name' }, { header: 'Type', accessorKey: 'type' }, { header: 'Owner', cell: ({ row }) => row.original.department || row.original.projectCode || '-' }, { header: 'Amount', cell: ({ row }) => `₹${Math.round(row.original.amount || 0).toLocaleString()}` }, { header: 'Consumed', cell: ({ row }) => `₹${Math.round(row.original.consumed || 0).toLocaleString()}` }, { header: 'Usage', cell: ({ row }) => `${Math.round(((row.original.consumed || 0) / (row.original.amount || 1)) * 100)}%` }, { header: 'Status', accessorKey: 'status' }]} />
      </div>
      {drawerOpen && <BudgetDrawer onClose={() => setDrawerOpen(false)} onSubmit={(payload) => create.mutate(payload)} isSaving={create.isPending} departments={departments} />}
    </>
  );
};
