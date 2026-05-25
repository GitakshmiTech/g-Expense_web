import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { DataTable } from '../../components/tables/DataTable';
import { api } from '../../services/platform.service';
import { usePermission } from '../../hooks/usePermissions';

export const Travel = () => {
  const queryClient = useQueryClient();
  const canCreate = usePermission('trips', 'create');
  const { data = [] } = useQuery({ queryKey: ['travel-requests'], queryFn: api.travelRequests });
  const create = useMutation({ mutationFn: api.createTravelRequest, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['travel-requests'] }) });
  return (
    <>
      <PageHeader title="Travel" description="Travel request, approval, expense linking, settlement, and finance verification." actions={canCreate && <button className="btn-primary" onClick={() => create.mutate({ title: 'Client Visit', destination: 'Mumbai', purpose: 'Customer meeting', estimatedCost: 22000, status: 'SUBMITTED', startDate: new Date(), endDate: new Date() })}>New Trip</button>} />
      <DataTable data={data} columns={[
        { header: 'Travel ID', accessorKey: 'travelId' },
        { header: 'Trip', accessorKey: 'title' },
        { header: 'Destination', accessorKey: 'destination' },
        { header: 'Budget', cell: ({ row }) => `${row.original.budget?.currency || 'INR'} ${Number(row.original.budget?.amount || 0).toLocaleString('en-IN')}` },
        { header: 'Linked Expenses', cell: ({ row }) => row.original.linkedExpenses?.length || 0 },
        { header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> }
      ]} />
    </>
  );
};
