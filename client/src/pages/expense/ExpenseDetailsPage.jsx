import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { ApprovalTimeline } from '../../components/common/ApprovalTimeline';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { api } from '../../services/platform.service';

export const ExpenseDetailsPage = () => {
  const { id } = useParams();
  const { data = [], isLoading } = useQuery({ queryKey: ['expenses'], queryFn: () => api.expenses({}) });
  if (isLoading) return <LoadingSkeleton rows={5} />;
  const expense = data.find((item) => item._id === id);
  if (!expense) return <EmptyState title="Expense not found" description="The requested expense is not available in this workspace." />;

  return (
    <>
      <PageHeader title={`${expense.category} Expense`} description={`${expense.merchant || 'Merchant pending'} · ${expense.amount} ${expense.currency}`} actions={<StatusBadge status={expense.status} />} />
      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <section className="panel p-6">
          <h2 className="mb-4 font-bold dark:text-white">Expense Summary</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ['Employee', expense.employeeId?.name || 'Me'],
              ['Department', expense.employeeId?.department || '-'],
              ['Tax', `${expense.taxAmount || 0} ${expense.currency}`],
              ['Payment Mode', expense.paymentMode],
              ['Date', expense.expenseDate ? new Date(expense.expenseDate).toLocaleDateString() : '-'],
              ['Receipts', expense.receipts?.length || 0]
            ].map(([label, value]) => <div key={label} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800"><p className="text-xs uppercase text-slate-500">{label}</p><p className="mt-1 font-semibold dark:text-white">{value}</p></div>)}
          </div>
        </section>
        <section className="panel p-6">
          <h2 className="mb-4 font-bold dark:text-white">Approval Timeline</h2>
          <ApprovalTimeline steps={expense.approvalPath || []} />
        </section>
      </div>
    </>
  );
};
