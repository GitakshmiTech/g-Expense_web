import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { DataTable } from '../../components/tables/DataTable';
import { api } from '../../services/platform.service';
import { usePermission } from '../../hooks/usePermissions';

export const Advance = () => {
  const queryClient = useQueryClient();
  const canCreate = usePermission('advances', 'create');
  const { data = [] } = useQuery({ queryKey: ['advance-requests'], queryFn: api.advanceRequests });
  const create = useMutation({ mutationFn: api.createAdvanceRequest, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['advance-requests'] }) });

  return (
    <>
      <PageHeader
        title="Advances"
        description="Advance request, approval, finance release, expense adjustment, and settlement tracking."
        actions={canCreate && <button className="btn-primary" onClick={() => create.mutate({ purpose: 'Travel advance', amount: 15000, currency: 'INR', status: 'SUBMITTED' })}>New Advance</button>}
      />
      <DataTable data={data} columns={[
        { header: 'Advance No', accessorKey: 'advanceNo' },
        { header: 'Employee', cell: ({ row }) => row.original.employeeId?.name || '-' },
        { header: 'Purpose', accessorKey: 'purpose' },
        { header: 'Requested', cell: ({ row }) => `${row.original.requested?.currency || 'INR'} ${Number(row.original.requested?.amount || 0).toLocaleString('en-IN')}` },
        { header: 'Settlement', accessorKey: 'settlementType' },
        { header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> }
      ]} />
    </>
  );
};
