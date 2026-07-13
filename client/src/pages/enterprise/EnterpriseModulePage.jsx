import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Eye, Pencil } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/tables/DataTable';
import { api } from '../../services/platform.service';
import { usePermission } from '../../hooks/usePermissions';
import { moduleConfigs } from './moduleConfig';
import { useGetEmployeeAccessListQuery } from '../../redux/rbacApi';

const getValue = (row, path) => path.split('.').reduce((value, key) => value?.[key], row);

const inflatePayload = (values, fields) => {
  const payload = {};
  fields.forEach((field) => {
    const rawValue = values[field.name];
    let value = field.type === 'number' ? Number(rawValue || 0) : field.type === 'tags' ? String(rawValue || '').split(',').map((item) => item.trim()).filter(Boolean) : rawValue;
    if (field.type === 'employee_select' && !rawValue) {
      value = null;
    }
    const parts = field.name.split('.');
    let target = payload;
    parts.forEach((part, index) => {
      if (index === parts.length - 1) target[part] = value;
      else target = target[part] ||= {};
    });
  });
  return payload;
};

const DynamicDrawerForm = ({ config, record, viewMode, onClose, onSubmit, isSaving, employees = [] }) => {
  const defaultValues = useMemo(() => {
    return Object.fromEntries(
      (config.fields || []).map((field) => {
        let val = field.defaultValue ?? (field.type === 'checkbox' ? false : '');
        if (record) {
          const rawVal = getValue(record, field.name);
          if (field.type === 'employee_select' && rawVal && typeof rawVal === 'object') {
            val = rawVal._id;
          } else {
            val = rawVal ?? val;
          }
        }
        return [field.name, val];
      })
    );
  }, [config.fields, record]);

  const { register, handleSubmit, reset } = useForm({ defaultValues });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30 backdrop-blur-sm">
      <form onSubmit={handleSubmit((values) => onSubmit(inflatePayload(values, config.fields || [])))} className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold dark:text-white">
              {viewMode ? `View ${config.title}` : record ? `Edit ${config.title}` : `Create ${config.title}`}
            </h2>
            <p className="text-sm text-slate-500">Live MongoDB-backed drawer form.</p>
          </div>
          <button type="button" className="btn-secondary px-2" onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <div className="grid flex-1 content-start gap-4 overflow-y-auto p-5 sm:grid-cols-2">
          {(config.fields || []).map((field) => (
            <label key={field.name} className={field.type === 'checkbox' ? 'flex items-center gap-3 rounded-md border border-slate-200 p-3 text-sm dark:border-slate-700 dark:text-slate-100' : 'grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200'}>
              {field.type === 'checkbox' ? (
                <>
                  <input type="checkbox" disabled={viewMode} className="h-4 w-4 rounded border-slate-300 text-brand-600" {...register(field.name)} />
                  {field.label}
                </>
              ) : (
                <>
                  <span>{field.label}</span>
                  {field.type === 'select' ? (
                    <select disabled={viewMode} className="input" {...register(field.name, { required: field.required })}>
                      {(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  ) : field.type === 'employee_select' ? (
                    <select disabled={viewMode} className="input" {...register(field.name, { required: field.required })}>
                      <option value="">Select Manager</option>
                      {employees.map((emp) => (
                        <option key={emp._id} value={emp._id}>
                          {emp.name} ({emp.role})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input disabled={viewMode} className="input" type={field.type || 'text'} {...register(field.name, { required: field.required })} />
                  )}
                </>
              )}
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 p-5 dark:border-slate-800">
          <button type="button" className="btn-secondary" onClick={onClose}>{viewMode ? 'Close' : 'Cancel'}</button>
          {!viewMode && (
            <button type="submit" className="btn-primary" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>
          )}
        </div>
      </form>
    </div>
  );
};

export const EnterpriseModulePage = ({ moduleKey }) => {
  const config = moduleConfigs[moduleKey];
  if (!config) {
    return <div className="panel p-5 text-sm text-slate-500">Module configuration not found.</div>;
  }
  const canCreate = usePermission(config.pageKey || moduleKey, 'create');
  const canEdit = usePermission(config.pageKey || moduleKey, 'edit');
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [viewMode, setViewMode] = useState(false);

  const { data: employeeData = { employees: [] } } = useGetEmployeeAccessListQuery();

  const query = useQuery({
    queryKey: ['enterprise', moduleKey],
    queryFn: async () => {
      if (config.endpoint === 'audit') return api.audit();
      if (config.endpoint === 'notifications') return api.notifications();
      return api.enterpriseList(config.endpoint, { limit: 200 });
    }
  });
  const records = Array.isArray(query.data) ? query.data : query.data?.items || [];
  
  const create = useMutation({
    mutationFn: (payload) => api.enterpriseCreate(config.endpoint, payload),
    onSuccess: () => {
      handleClose();
      queryClient.invalidateQueries({ queryKey: ['enterprise', moduleKey] });
      queryClient.invalidateQueries({ queryKey: ['violations'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    }
  });

  const update = useMutation({
    mutationFn: ({ id, payload }) => api.enterpriseUpdate(config.endpoint, id, payload),
    onSuccess: () => {
      handleClose();
      queryClient.invalidateQueries({ queryKey: ['enterprise', moduleKey] });
      queryClient.invalidateQueries({ queryKey: ['violations'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const handleClose = () => {
    setDrawerOpen(false);
    setEditingRecord(null);
    setViewMode(false);
  };

  const handleView = (record) => {
    setEditingRecord(record);
    setViewMode(true);
    setDrawerOpen(true);
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setViewMode(false);
    setDrawerOpen(true);
  };

  const handleSubmit = (payload) => {
    if (editingRecord) {
      update.mutate({ id: editingRecord._id, payload });
    } else {
      create.mutate(payload);
    }
  };

  const columns = useMemo(() => {
    const cols = (config.columns || []).map((key) => ({
      header: key.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
      accessorKey: key,
      cell: ({ row }) => {
        const value = getValue(row.original, key);
        if (Array.isArray(value)) return value.join(', ');
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (/At$|Date$/.test(key) && value) return new Date(value).toLocaleString('en-IN');
        if (value && typeof value === 'object') return value.name || value.email || value._id || JSON.stringify(value);
        return value ? String(value).slice(0, 80) : '-';
      }
    }));

    if (moduleKey === 'departments') {
      cols.push({
        header: 'Actions',
        cell: ({ row }) => {
          const record = row.original;
          return (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={() => handleView(record)}
                title="View Details"
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
              >
                <Eye className="h-4 w-4 text-slate-500 hover:text-blue-600" />
              </button>
              <button 
                onClick={() => handleEdit(record)}
                title="Edit Department"
                disabled={!canEdit}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition disabled:opacity-50"
              >
                <Pencil className="h-4 w-4 text-slate-500 hover:text-amber-600" />
              </button>
            </div>
          );
        }
      });
    }

    return cols;
  }, [config.columns, moduleKey, canEdit]);

  return (
    <>
      <PageHeader
        title={config.title}
        description={config.description}
        actions={!config.readonly && canCreate && (
          <button 
            className="btn-primary" 
            onClick={() => {
              setEditingRecord(null);
              setViewMode(false);
              setDrawerOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> New
          </button>
        )}
      />
      {query.isError && <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">Unable to load {config.title}. Please check access or try again.</div>}
      <DataTable data={records} columns={columns} searchPlaceholder={`Search ${config.title.toLowerCase()}`} />
      {drawerOpen && (
        <DynamicDrawerForm 
          key={editingRecord?._id || 'new'}
          config={config} 
          record={editingRecord}
          viewMode={viewMode}
          onClose={handleClose} 
          onSubmit={handleSubmit} 
          isSaving={create.isPending || update.isPending} 
          employees={
            moduleKey === 'departments'
              ? (employeeData.employees || []).filter((emp) => emp.role === 'manager')
              : (employeeData.employees || [])
          } 
        />
      )}
    </>
  );
};
