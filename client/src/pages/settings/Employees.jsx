import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Eye, Pencil, UserCheck, UserX, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/tables/DataTable';
import { Drawer } from '../../components/common/Drawer';
import { api } from '../../services/platform.service';
import { usePermission } from '../../hooks/usePermissions';

export const Employees = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [viewMode, setViewMode] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const canCreate = usePermission('employees', 'create');
  const canEdit = usePermission('employees', 'edit');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
    department: '',
    employeeId: '',
    managerId: '',
  });

  const queryClient = useQueryClient();

  const { data = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: api.users });
  const { data: departmentData } = useQuery({
    queryKey: ['enterprise', 'departments'],
    queryFn: () => api.enterpriseList('departments', { limit: 200 })
  });
  const departments = departmentData?.items || [];
  const filteredEmployees = data.filter(user => user.role !== 'company_admin');
  const managerOptions = data.filter((user) => ['manager', 'company_admin'].includes(user.role) && user.status !== 'suspended');

  const mutation = useMutation({
    mutationFn: api.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      handleCloseDrawer();
    },
    onError: (error) => {
      console.error('Failed to create employee', error);
      alert('Failed to create employee: ' + (error.response?.data?.message || error.message));
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      handleCloseDrawer();
    },
    onError: (error) => {
      console.error('Failed to update employee', error);
      alert('Failed to update employee: ' + (error.response?.data?.message || error.message));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsConfirmOpen(false);
      setEmployeeToDelete(null);
    },
    onError: (error) => {
      console.error('Failed to delete employee', error);
      alert('Failed to delete employee: ' + (error.response?.data?.message || error.message));
    }
  });

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const normalizedForm = {
      ...formData,
      managerId: formData.managerId || null
    };
    if (editingEmployee) {
      const { password, ...payload } = normalizedForm;
      updateMutation.mutate({ id: editingEmployee._id, payload });
    } else {
      mutation.mutate(normalizedForm);
    }
  };

  const handleView = (employee) => {
    setEditingEmployee(employee);
    setViewMode(true);
    setFormData({
      name: employee.name || '',
      email: employee.email || '',
      password: '',
      role: employee.role || 'employee',
      department: employee.department || '',
      employeeId: employee.employeeId || '',
      managerId: employee.managerId?._id || employee.managerId || '',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setViewMode(false);
    setFormData({
      name: employee.name || '',
      email: employee.email || '',
      password: '',
      role: employee.role || 'employee',
      department: employee.department || '',
      employeeId: employee.employeeId || '',
      managerId: employee.managerId?._id || employee.managerId || '',
    });
    setIsModalOpen(true);
  };

  const handleToggleStatus = (employee) => {
    const newStatus = employee.status === 'suspended' ? 'active' : 'suspended';
    updateMutation.mutate({ id: employee._id, payload: { status: newStatus } });
  };

  const handleCloseDrawer = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
    setViewMode(false);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'employee',
      department: '',
      employeeId: '',
      managerId: '',
    });
  };

  return (
    <>
      <PageHeader 
        title="Employees" 
        actions={
          <>
            <div className="relative flex items-center">
              <Search className="absolute left-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search records..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-64 transition-all text-slate-900 dark:text-slate-100"
              />
            </div>
            {canCreate && (
              <button 
                onClick={() => {
                  setEditingEmployee(null);
                  setViewMode(false);
                  setFormData({ name: '', email: '', password: '', role: 'employee', department: '', employeeId: '', managerId: '' });
                  setIsModalOpen(true);
                }} 
                className="btn btn-primary flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shrink-0"
              >
                <Plus className="h-4 w-4" /> Add Employee
              </button>
            )}
          </>
        }
      />
      <DataTable 
        data={filteredEmployees} 
        showSearch={false}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        columns={[
          { header: 'Employee Code', accessorKey: 'employeeId', cell: ({ row }) => row.original.employeeId || '-' },
          { header: 'Name', accessorKey: 'name' }, 
          { header: 'Email', accessorKey: 'email' }, 
          { header: 'Role', accessorKey: 'role' }, 
          { header: 'Department', accessorKey: 'department' }, 
          { header: 'Manager', cell: ({ row }) => {
            const managerId = row.original.managerId?._id || row.original.managerId;
            return data.find((user) => user._id === managerId)?.name || '-';
          } },
          { 
            header: 'Status', 
            accessorKey: 'status',
            cell: ({ row }) => {
              const status = row.original.status || 'active';
              return (
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  status === 'active' 
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400' 
                    : status === 'invited'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400'
                }`}>
                  {status}
                </span>
              );
            }
          },
          {
            header: 'Actions',
            cell: ({ row }) => {
              const employee = row.original;
              return (
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => handleView(employee)}
                    title="View Details"
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                  >
                    <Eye className="h-4 w-4 text-slate-500 hover:text-blue-600" />
                  </button>
                  <button 
                    onClick={() => handleEdit(employee)}
                    title="Edit Employee"
                    disabled={!canEdit}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                  >
                    <Pencil className="h-4 w-4 text-slate-500 hover:text-amber-600" />
                  </button>
                  <button 
                    onClick={() => handleToggleStatus(employee)}
                    title={employee.status === 'suspended' ? 'Activate Employee' : 'Deactivate Employee'}
                    disabled={!canEdit}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                  >
                    {employee.status === 'suspended' ? (
                      <UserCheck className="h-4 w-4 text-slate-500 hover:text-emerald-600" />
                    ) : (
                      <UserX className="h-4 w-4 text-slate-500 hover:text-rose-600" />
                    )}
                  </button>
                  <button 
                    onClick={() => {
                      setEmployeeToDelete(employee);
                      setIsConfirmOpen(true);
                    }}
                    title="Delete Employee"
                    disabled={!canEdit}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                  >
                    <Trash2 className="h-4 w-4 text-slate-500 hover:text-rose-600" />
                  </button>
                </div>
              );
            }
          }
        ]} 
      />

      <Drawer 
        open={isModalOpen} 
        title={viewMode ? "View Employee Details" : editingEmployee ? "Edit Employee" : "Create New Employee"}
        onClose={handleCloseDrawer}
        footer={
          <div className="flex justify-end gap-2">
            <button 
              type="button" 
              onClick={handleCloseDrawer} 
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {viewMode ? 'Close' : 'Cancel'}
            </button>
            {!viewMode && (
              <button 
                type="button" 
                onClick={handleSubmit} 
                disabled={mutation.isPending || updateMutation.isPending} 
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {mutation.isPending || updateMutation.isPending ? 'Saving...' : editingEmployee ? 'Update Employee' : 'Save Employee'}
              </button>
            )}
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Employee Code</label>
            <input 
              type="text" 
              name="employeeId" 
              value={formData.employeeId} 
              onChange={handleChange} 
              disabled={viewMode}
              className="w-full p-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white disabled:opacity-60"
              placeholder="e.g. EMP101"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
            <input 
              type="text" 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              required 
              disabled={viewMode}
              className="w-full p-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white disabled:opacity-60"
              placeholder="Employee name"
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
              disabled={viewMode}
              className="w-full p-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white disabled:opacity-60"
              placeholder="john@example.com"
            />
          </div>
          {!editingEmployee && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
              <input 
                type="password" 
                name="password" 
                value={formData.password} 
                onChange={handleChange} 
                required={!editingEmployee} 
                disabled={viewMode}
                className="w-full p-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white disabled:opacity-60"
                placeholder="••••••••"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
              <select 
                name="role" 
                value={formData.role} 
                onChange={handleChange}
                disabled={viewMode}
                className="w-full p-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white disabled:opacity-60"
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="finance">Finance</option>
                <option value="company_admin">Company Admin</option>
              </select>
            </div>
             <div>
               <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Department</label>
               {viewMode ? (
                 <input 
                   type="text" 
                   name="department" 
                   value={formData.department} 
                   disabled
                   className="w-full p-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white disabled:opacity-60"
                 />
               ) : (
                 <select
                   name="department"
                   value={formData.department}
                   onChange={handleChange}
                   className="w-full p-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                 >
                   <option value="">Select Department</option>
                   {departments.map((dept) => (
                     <option key={dept._id} value={dept.name}>
                       {dept.name} ({dept.code})
                     </option>
                   ))}
                 </select>
               )}
             </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Reporting Manager</label>
            <select
              name="managerId"
              value={formData.managerId}
              onChange={handleChange}
              disabled={viewMode || formData.role === 'manager' || formData.role === 'company_admin'}
              className="w-full p-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white disabled:opacity-60"
            >
              <option value="">No reporting manager</option>
              {managerOptions
                .filter((manager) => manager._id !== editingEmployee?._id)
                .map((manager) => (
                  <option key={manager._id} value={manager._id}>
                    {manager.name} ({manager.role})
                  </option>
                ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">Employee approval requests go to this manager.</p>
          </div>
        </form>
      </Drawer>

      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 transform transition-all">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Delete Employee</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Are you sure you want to delete <span className="font-semibold text-slate-900 dark:text-white">{employeeToDelete?.name}</span>? This action is permanent and cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsConfirmOpen(false);
                  setEmployeeToDelete(null);
                }}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50 rounded-lg dark:text-slate-300 dark:hover:bg-slate-800 font-semibold transition text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(employeeToDelete?._id)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-rose-600 text-white font-semibold rounded-lg hover:bg-rose-700 disabled:opacity-50 transition text-sm"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
