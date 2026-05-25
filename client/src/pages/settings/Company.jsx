import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/tables/DataTable';
import { api } from '../../services/platform.service';

export const Company = () => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', adminName: '', adminEmail: '', adminPassword: '' });
  
  const queryClient = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ['companies'], queryFn: api.companies, retry: false });
  
  const createMutation = useMutation({
    mutationFn: api.createCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setOpen(false);
      setFormData({ name: '', adminName: '', adminEmail: '', adminPassword: '' });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <>
      <PageHeader 
        title="Super Admin Companies" 
        description="Company creation, subscription, limits, billing, and feature controls." 
        actions={
          <div className="flex gap-2">
            <button 
              className="btn-secondary" 
              onClick={async () => {
                if (window.confirm('Are you sure you want to migrate all submitted expenses to manager_review status?')) {
                  try {
                    const res = await api.migrateSubmitted();
                    alert(res.message || 'Migration completed successfully!');
                  } catch (err) {
                    alert(err.response?.data?.message || 'Migration failed');
                  }
                }
              }}
            >
              Migrate Submitted Expenses
            </button>
            <button className="btn-primary flex items-center gap-2" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Create Company
            </button>
          </div>
        } 
      />
      <DataTable data={data} columns={[{ header: 'Company', accessorKey: 'name' }, { header: 'Status', accessorKey: 'status' }, { header: 'Plan', accessorFn: (row) => row.subscription?.plan }, { header: 'User Limit', accessorFn: (row) => row.limits?.users }, { header: 'OCR', accessorFn: (row) => row.features?.ocr ? 'Enabled' : 'Disabled' }]} />
      
      <Modal open={open} onClose={() => setOpen(false)} title="Create New Company" description="Add a new company tenant to the system." footer={<><button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button><button type="submit" form="create-company-form" className="btn-primary" disabled={createMutation.isPending}>{createMutation.isPending ? 'Creating...' : 'Create'}</button></>}>
        <form id="create-company-form" className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Company Name</label>
            <input required type="text" className="input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Acme Corp" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Admin Name</label>
              <input required type="text" className="input" value={formData.adminName} onChange={(e) => setFormData({ ...formData, adminName: e.target.value })} placeholder="John Doe" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Admin Email</label>
              <input required type="email" className="input" value={formData.adminEmail} onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })} placeholder="john@acme.com" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Admin Password (Optional)</label>
            <input type="text" className="input" value={formData.adminPassword} onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })} placeholder="Default is Admin@12345" />
          </div>
        </form>
      </Modal>
    </>
  );
};
