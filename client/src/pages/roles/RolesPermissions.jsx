import { Save, UserCog } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import {
  useGetEmployeeAccessListQuery,
  useGetEmployeeAccessQuery,
  useGetRbacPagesQuery,
  useUpsertEmployeeAccessMutation
} from '../../redux/rbacApi';
import { usePermission } from '../../hooks/usePermissions';

const hasGrant = (grants, page, action) => grants.some((grant) => grant.page === page && grant.action === action && grant.allowed !== false);

const toggleGrant = (grants, page, action) => (
  hasGrant(grants, page, action)
    ? grants.filter((grant) => !(grant.page === page && grant.action === action))
    : [...grants, { page, action, allowed: true }]
);

const isAllGranted = (grants, page) => {
  if (!page.actions || page.actions.length === 0) return false;
  return page.actions.every((action) => hasGrant(grants, page.key, action));
};

const toggleAllGrants = (grants, page) => {
  const allChecked = isAllGranted(grants, page);
  if (allChecked) {
    return grants.filter((grant) => !(grant.page === page.key && page.actions.includes(grant.action)));
  } else {
    const filtered = grants.filter((grant) => !(grant.page === page.key && page.actions.includes(grant.action)));
    const added = page.actions.map((action) => ({ page: page.key, action, allowed: true }));
    return [...filtered, ...added];
  }
};

const PermissionMatrix = ({ pages = [], grants = [], onChange, disabled }) => (
  <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
    <table className="w-full min-w-[760px] text-left text-sm">
      <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900 dark:text-slate-400">
        <tr>
          <th className="px-4 py-3">Page</th>
          <th className="px-3 py-3">All</th>
          {['view', 'create', 'edit', 'delete', 'approve', 'export', 'manage'].map((action) => <th key={action} className="px-3 py-3">{action}</th>)}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-950">
        {pages.map((page) => {
          const allChecked = isAllGranted(grants, page);
          return (
            <tr key={page.key}>
              <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{page.label}</td>
              <td className="px-3 py-3">
                {page.actions && page.actions.length > 0 ? (
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    checked={allChecked}
                    onChange={() => onChange(toggleAllGrants(grants, page))}
                    disabled={disabled}
                  />
                ) : (
                  <span className="text-slate-300">-</span>
                )}
              </td>
              {['view', 'create', 'edit', 'delete', 'approve', 'export', 'manage'].map((action) => (
                <td key={action} className="px-3 py-3">
                  {page.actions.includes(action) ? (
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      checked={hasGrant(grants, page.key, action)}
                      onChange={() => onChange(toggleGrant(grants, page.key, action))}
                      disabled={disabled}
                    />
                  ) : (
                    <span className="text-slate-300">-</span>
                  )}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

export const RolesPermissions = () => {
  const { data: pages = [] } = useGetRbacPagesQuery();
  const { data: employeeData = { employees: [] } } = useGetEmployeeAccessListQuery();
  const [upsertEmployeeAccess] = useUpsertEmployeeAccessMutation();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const { data: selectedEmployeeAccess } = useGetEmployeeAccessQuery(selectedEmployeeId, { skip: !selectedEmployeeId });
  const [employeeForm, setEmployeeForm] = useState({ permissions: [], deniedPermissions: [] });
  const canEdit = usePermission('roles_permissions', 'edit');
  const canManage = usePermission('roles_permissions', 'manage');
  const canSave = canEdit || canManage;

  const totalActions = pages.reduce((sum, page) => sum + (page.actions?.length || 0), 0);
  const currentGrants = employeeForm.permissions.filter((grant) => grant.allowed !== false).length;
  const isAllEnabled = totalActions > 0 && currentGrants >= totalActions;

  const toggleAllAccess = () => {
    if (isAllEnabled) {
      setEmployeeForm((prev) => ({ ...prev, permissions: [] }));
    } else {
      const allGrants = [];
      pages.forEach((page) => {
        if (page.actions) {
          page.actions.forEach((action) => {
            allGrants.push({ page: page.key, action, allowed: true });
          });
        }
      });
      setEmployeeForm((prev) => ({ ...prev, permissions: allGrants }));
    }
  };

  useEffect(() => {
    const assignment = selectedEmployeeAccess?.assignment;
    setEmployeeForm({
      permissions: assignment?.permissions || [],
      deniedPermissions: assignment?.deniedPermissions || []
    });
  }, [selectedEmployeeAccess]);

  const saveEmployee = async () => {
    await upsertEmployeeAccess({
      employeeId: selectedEmployeeId,
      permissions: employeeForm.permissions,
      deniedPermissions: employeeForm.deniedPermissions
    }).unwrap();
  };

  return (
    <div className="space-y-5">
      <PageHeader 
        title="Roles & Permissions" 
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {canSave && (
              <button 
                type="button"
                className="btn-secondary" 
                onClick={toggleAllAccess} 
                disabled={!selectedEmployeeId}
              >
                {isAllEnabled ? 'Disable All' : 'Enable All'}
              </button>
            )}
            <select 
              className="input w-64" 
              value={selectedEmployeeId} 
              onChange={(event) => setSelectedEmployeeId(event.target.value)}
            >
              <option value="">Select employee</option>
              {employeeData.employees?.map((employee) => (
                <option key={employee._id} value={employee._id}>
                  {employee.name} - {employee.role}
                </option>
              ))}
            </select>
            {canSave && (
              <button 
                className="btn-primary" 
                onClick={saveEmployee} 
                disabled={!selectedEmployeeId}
              >
                <Save className="h-4 w-4" /> Save
              </button>
            )}
          </div>
        }
      />

      <section className="w-full">
        <PermissionMatrix pages={pages} grants={employeeForm.permissions} onChange={(permissions) => setEmployeeForm((prev) => ({ ...prev, permissions }))} disabled={!canSave} />
      </section>
    </div>
  );
};
