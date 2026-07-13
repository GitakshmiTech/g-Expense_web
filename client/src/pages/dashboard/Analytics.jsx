import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../../components/common/PageHeader';
import { AnalyticsCard } from '../../components/common/AnalyticsCard';
import { StatCard } from '../../components/common/StatCard';
import { CategoryBarChart, StatusPieChart, TrendLineChart } from '../../components/charts/ExpenseCharts';
import { api } from '../../services/platform.service';
import { BarChart3, Clock3, ReceiptText, WalletCards } from 'lucide-react';

export const Analytics = () => {
  const { data } = useQuery({ queryKey: ['analytics'], queryFn: api.analytics });
  const totalSpend = Number(data?.totals?.totalSpend || 0);
  const count = Number(data?.totals?.count || 0);
  const avg = Number(data?.totals?.avg || 0);
  const budgetUsage = data?.budgetUsage || [];
  const totalBudget = budgetUsage.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const consumedBudget = budgetUsage.reduce((sum, item) => sum + Number(item.consumed || 0), 0);
  const approvalDelay = Math.round(Number(data?.approvalSla?.averageHours || 0));

  return (
    <>
      <PageHeader title="Analytics" description="Expense trends, department analysis, approval SLA, budget usage, and top spender views." />
      <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Spend" value={`₹${Math.round(totalSpend).toLocaleString()}`} icon={WalletCards} />
        <StatCard label="Expense Count" value={count.toLocaleString()} icon={ReceiptText} tone="green" />
        <StatCard label="Average Expense" value={`₹${Math.round(avg).toLocaleString()}`} icon={BarChart3} tone="amber" />
        <StatCard label="Approval SLA" value={approvalDelay ? `${approvalDelay}h` : 'Ready'} icon={Clock3} tone="rose" />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <AnalyticsCard title="Expense Trends" caption="Spend movement across recent months."><TrendLineChart data={data?.monthlySpend || data?.byDepartment || []} /></AnalyticsCard>
        <AnalyticsCard title="Department Spend" caption="Spend grouped by employee department."><CategoryBarChart data={data?.byDepartment || []} /></AnalyticsCard>
        <AnalyticsCard title="Approval Status" caption="Lifecycle distribution by status."><StatusPieChart data={data?.byStatus || []} /></AnalyticsCard>
        <AnalyticsCard title="Budget Usage" value={`${Math.round((consumedBudget / (totalBudget || 1)) * 100)}%`} caption={`${Math.round(consumedBudget).toLocaleString()} consumed of ${Math.round(totalBudget).toLocaleString()}`}>
          <div className="space-y-3">
            {(budgetUsage.length ? budgetUsage : [{ name: 'No active budget', consumed: 0, amount: 1 }]).slice(0, 5).map((budget) => {
              const percent = Math.min((Number(budget.consumed || 0) / Number(budget.amount || 1)) * 100, 100);
              return (
                <div key={budget._id || budget.name} className="grid gap-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-500">
                    <span>{budget.name || budget.department || budget.projectCode || 'Budget'}</span>
                    <span>{Math.round(percent)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-brand-600" style={{ width: `${percent}%` }} /></div>
                </div>
              );
            })}
          </div>
        </AnalyticsCard>
      </div>
    </>
  );
};
