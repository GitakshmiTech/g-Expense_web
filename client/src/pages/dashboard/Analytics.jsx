import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../../components/common/PageHeader';
import { CategoryBarChart, StatusPieChart } from '../../components/charts/ExpenseCharts';
import { api } from '../../services/platform.service';

export const Analytics = () => {
  const { data } = useQuery({ queryKey: ['analytics'], queryFn: api.analytics });
  return (
    <>
      <PageHeader title="Analytics" description="Expense trends, department analysis, approval SLA, budget usage, and top spender views." />
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="panel rounded-lg p-4"><h2 className="mb-3 font-bold dark:text-white">Department Spend</h2><CategoryBarChart data={data?.byDepartment || []} /></section>
        <section className="panel rounded-lg p-4"><h2 className="mb-3 font-bold dark:text-white">Approval Status</h2><StatusPieChart data={data?.byStatus || []} /></section>
      </div>
    </>
  );
};
