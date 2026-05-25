import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../../components/common/PageHeader';
import { ApprovalQueue } from '../../components/dashboard/ApprovalQueue';
import { api } from '../../services/platform.service';

export const Approvals = () => {
  const queryClient = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ['expenses'], queryFn: () => api.expenses({}) });
  const action = useMutation({ mutationFn: ({ id, payload }) => api.actExpense(id, payload), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }) });
  return (
    <>
      <PageHeader title="Approvals" description="Manager, finance, and CFO approval actions with send-back and reject support." />
      <ApprovalQueue expenses={data.filter((item) => !['draft', 'approved', 'rejected', 'paid'].includes(item.status))} onAction={(id, payload) => action.mutate({ id, payload })} />
    </>
  );
};
