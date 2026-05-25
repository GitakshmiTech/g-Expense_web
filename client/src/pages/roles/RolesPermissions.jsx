import { Save, UserCog } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import {
  useGetEmployeeAccessListQuery,
  useGetEmployeeAccessQuery,
  useGetRbacPagesQuery,
  useUpsertEmployeeAccessMutation
} from '../../redux/rbacApi';

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

const PermissionMatrix = ({ pages = [], grants = [], onChange }) => (
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
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 cursor-pointer"
                    checked={allChecked}
                    onChange={() => onChange(toggleAllGrants(grants, page))}
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
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 cursor-pointer"
                      checked={hasGrant(grants, page.key, action)}
                      onChange={() => onChange(toggleGrant(grants, page.key, action))}
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
      <PageHeader title="Roles & Permissions" description="Manage employee-specific permissions and extra page access overrides." />

      <section className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-2 font-bold dark:text-white"><UserCog className="h-5 w-5" /> Employee Access</div>
          <select className="input mb-3" value={selectedEmployeeId} onChange={(event) => setSelectedEmployeeId(event.target.value)}>
            <option value="">Select employee</option>
            {employeeData.employees?.map((employee) => <option key={employee._id} value={employee._id}>{employee.name} - {employee.role}</option>)}
          </select>
          <button className="btn-primary mt-4 w-full" onClick={saveEmployee} disabled={!selectedEmployeeId}><Save className="h-4 w-4" /> Save Employee Access</button>
        </div>
        <PermissionMatrix pages={pages} grants={employeeForm.permissions} onChange={(permissions) => setEmployeeForm((prev) => ({ ...prev, permissions }))} />
      </section>
    </div>
  );
};
