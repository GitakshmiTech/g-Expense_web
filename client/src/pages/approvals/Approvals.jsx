import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../../components/common/PageHeader';
import { ApprovalQueue } from '../../components/dashboard/ApprovalQueue';
import { api } from '../../services/platform.service';
import { REVIEW_STATUSES, normalizeExpenseStatus } from '../../utils/expenseWorkflow';

export const Approvals = () => {
  const queryClient = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ['expenses'], queryFn: () => api.expenses({}) });
  const action = useMutation({ mutationFn: ({ id, payload }) => api.actExpense(id, payload), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }) });
  return (
    <>
      <PageHeader title="Approvals" description="Manager, finance, and CFO approval actions with send-back and reject support." />
      <ApprovalQueue expenses={data.filter((item) => REVIEW_STATUSES.includes(normalizeExpenseStatus(item.status)))} onAction={(id, payload) => action.mutate({ id, payload })} />
    </>
  );
};
