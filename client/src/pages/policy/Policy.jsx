import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/tables/DataTable';
import { api } from '../../services/platform.service';
import { PolicyBuilderDrawer } from './PolicyBuilderDrawer';
import { Plus } from 'lucide-react';

export const Policy = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const queryClient = useQueryClient();
  
  const { data = { items: [] } } = useQuery({ 
    queryKey: ['enterprise_policies'], 
    queryFn: () => api.enterpriseList('policies') 
  });
  
  const createMutation = useMutation({ 
    mutationFn: (payload) => api.enterpriseCreate('policies', payload), 
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprise_policies'] });
      setIsDrawerOpen(false);
    } 
  });

  const handleSubmit = (formData) => {
    // Transform formatting to fit the payload if needed
    createMutation.mutate(formData);
  };

  return (
    <>
      <PageHeader 
        title="Enterprise Policy Engine" 
        description="Dynamic rule engine for expense limits, travel, approvals, and compliance." 
        actions={
          <button className="btn-primary flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700" onClick={() => setIsDrawerOpen(true)}>
            <Plus className="w-4 h-4" /> Create Policy
          </button>
        } 
      />
      
      <DataTable 
        data={data.items} 
        columns={[
          { header: 'Policy Name', accessorKey: 'name' }, 
          { header: 'Code', accessorKey: 'code' }, 
          { header: 'Status', cell: ({ row }) => <span className={`px-2 py-1 text-xs rounded-full ${row.original.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>{row.original.status}</span> }, 
          { header: 'Priority', accessorKey: 'priority' },
          { header: 'Limit Type', cell: ({ row }) => row.original.limits?.limitType || '-' }
        ]} 
      />

      {isDrawerOpen && (
        <PolicyBuilderDrawer 
          open={isDrawerOpen} 
          onClose={() => setIsDrawerOpen(false)} 
          onSubmit={handleSubmit}
          isSubmitting={createMutation.isPending}
        />
      )}
    </>
  );
};
