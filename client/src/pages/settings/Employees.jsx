import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/tables/DataTable';
import { Drawer } from '../../components/common/Drawer';
import { api } from '../../services/platform.service';
import { usePermission } from '../../hooks/usePermissions';

export const Employees = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const canCreate = usePermission('employees', 'create');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
    department: '',
  });

  const queryClient = useQueryClient();

  const { data = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: api.users });

  const mutation = useMutation({
    mutationFn: api.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
      setFormData({ name: '', email: '', password: '', role: 'employee', department: '' });
    },
    onError: (error) => {
      console.error('Failed to create employee', error);
      alert('Failed to create employee: ' + (error.response?.data?.message || error.message));
    }
  });

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <>
      <PageHeader 
        title="Employees" 
        description="Employee, department, designation, manager, role, and permission administration." 
        actions={
          canCreate &&
          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Add Employee
          </button>
        }
      />
      <DataTable 
        data={data} 
        columns={[
          { header: 'Name', accessorKey: 'name' }, 
          { header: 'Email', accessorKey: 'email' }, 
          { header: 'Role', accessorKey: 'role' }, 
          { header: 'Department', accessorKey: 'department' }, 
          { header: 'Status', accessorKey: 'status' }
        ]} 
      />

      <Drawer 
        open={isModalOpen} 
        title="Create New Employee" 
        onClose={() => setIsModalOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button>
            <button type="button" onClick={handleSubmit} disabled={mutation.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {mutation.isPending ? 'Saving...' : 'Save Employee'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
            <input 
              type="text" 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              required 
              className="w-full p-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              placeholder="e.g. John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
            <input 
              type="email" 
              name="email" 
              value={formData.email} 
              onChange={handleChange} 
              required 
              className="w-full p-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              placeholder="john@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
            <input 
              type="password" 
              name="password" 
              value={formData.password} 
              onChange={handleChange} 
              required 
              className="w-full p-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              placeholder="••••••••"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
              <select 
                name="role" 
                value={formData.role} 
                onChange={handleChange}
                className="w-full p-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="finance">Finance</option>
                <option value="company_admin">Company Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Department</label>
              <input 
                type="text" 
                name="department" 
                value={formData.department} 
                onChange={handleChange} 
                className="w-full p-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                placeholder="e.g. Engineering"
              />
            </div>
          </div>
        </form>
      </Drawer>
    </>
  );
};
