import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/tables/DataTable';
import { api } from '../../services/platform.service';
import { usePermission } from '../../hooks/usePermissions';
import { moduleConfigs } from './moduleConfig';

const getValue = (row, path) => path.split('.').reduce((value, key) => value?.[key], row);

const inflatePayload = (values, fields) => {
  const payload = {};
  fields.forEach((field) => {
    const rawValue = values[field.name];
    const value = field.type === 'number' ? Number(rawValue || 0) : field.type === 'tags' ? String(rawValue || '').split(',').map((item) => item.trim()).filter(Boolean) : rawValue;
    const parts = field.name.split('.');
    let target = payload;
    parts.forEach((part, index) => {
      if (index === parts.length - 1) target[part] = value;
      else target = target[part] ||= {};
    });
  });
  return payload;
};

const DynamicDrawerForm = ({ config, onClose, onSubmit, isSaving }) => {
  const defaultValues = Object.fromEntries((config.fields || []).map((field) => [field.name, field.defaultValue ?? (field.type === 'checkbox' ? false : '')]));
  const { register, handleSubmit } = useForm({ defaultValues });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30 backdrop-blur-sm">
      <form onSubmit={handleSubmit((values) => onSubmit(inflatePayload(values, config.fields || [])))} className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold dark:text-white">Create {config.title}</h2>
            <p className="text-sm text-slate-500">Live MongoDB-backed drawer form.</p>
          </div>
          <button type="button" className="btn-secondary px-2" onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <div className="grid flex-1 content-start gap-4 overflow-y-auto p-5 sm:grid-cols-2">
          {(config.fields || []).map((field) => (
            <label key={field.name} className={field.type === 'checkbox' ? 'flex items-center gap-3 rounded-md border border-slate-200 p-3 text-sm dark:border-slate-700 dark:text-slate-100' : 'grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200'}>
              {field.type === 'checkbox' ? (
                <>
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600" {...register(field.name)} />
                  {field.label}
                </>
              ) : (
                <>
                  <span>{field.label}</span>
                  {field.type === 'select' ? (
                    <select className="input" {...register(field.name, { required: field.required })}>
                      {(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  ) : (
                    <input className="input" type={field.type || 'text'} {...register(field.name, { required: field.required })} />
                  )}
                </>
              )}
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 p-5 dark:border-slate-800">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
};

export const EnterpriseModulePage = ({ moduleKey }) => {
  const config = moduleConfigs[moduleKey];
  const canCreate = usePermission(config.pageKey || moduleKey, 'create');
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
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
      setDrawerOpen(false);
      queryClient.invalidateQueries({ queryKey: ['enterprise', moduleKey] });
    }
  });
  const columns = useMemo(
    () => (config.columns || []).map((key) => ({
      header: key.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
      accessorKey: key,
      cell: ({ row }) => {
        const value = getValue(row.original, key);
        if (Array.isArray(value)) return value.join(', ');
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (value && typeof value === 'object') return value.name || value.email || value._id || JSON.stringify(value);
        return value ? String(value).slice(0, 80) : '-';
      }
    })),
    [config.columns]
  );

  return (
    <>
      <PageHeader
        title={config.title}
        description={config.description}
        actions={!config.readonly && canCreate && <button className="btn-primary" onClick={() => setDrawerOpen(true)}><Plus className="h-4 w-4" /> New</button>}
      />
      <DataTable data={records} columns={columns} searchPlaceholder={`Search ${config.title.toLowerCase()}`} />
      {drawerOpen && <DynamicDrawerForm config={config} onClose={() => setDrawerOpen(false)} onSubmit={(payload) => create.mutate(payload)} isSaving={create.isPending} />}
    </>
  );
};
