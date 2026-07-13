import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useGetMyAccessQuery } from '../redux/rbacApi';

const DEFAULT_PANEL_PAGES = {
  employee: ['dashboard', 'expense_reports', 'trips', 'reimbursements', 'notifications', 'support', 'settings'],
  manager: ['dashboard', 'expense_reports', 'trips', 'budgets', 'violation_center', 'analytics', 'notifications', 'support', 'settings'],
  finance: ['dashboard', 'expense_reports', 'reimbursements', 'budgets', 'ocr_receipts', 'violation_center', 'analytics', 'notifications', 'support', 'audit_logs', 'settings'],
  cfo: ['dashboard', 'expense_reports', 'reimbursements', 'budgets', 'ocr_receipts', 'violation_center', 'analytics', 'notifications', 'support', 'audit_logs', 'settings']
};

const grantsToPermissions = (grants = []) =>
  grants.reduce((map, grant) => {
    map[grant.page] ||= {};
    map[grant.page][grant.action] = true;
    return map;
  }, {});

const EMPLOYEE_GRANTS = [
  { page: 'dashboard', action: 'view' },
  { page: 'expense_reports', action: 'view' },
  { page: 'expense_reports', action: 'create' },
  { page: 'trips', action: 'view' },
  { page: 'trips', action: 'create' },
  { page: 'reimbursements', action: 'view' },
  { page: 'notifications', action: 'view' },
  { page: 'support', action: 'view' },
  { page: 'support', action: 'create' },
  { page: 'settings', action: 'view' },
  { page: 'settings', action: 'edit' }
];

const DEFAULT_PANEL_PERMISSIONS = {
  employee: grantsToPermissions(EMPLOYEE_GRANTS),
  manager: grantsToPermissions([
    ...EMPLOYEE_GRANTS,
    { page: 'expense_categories', action: 'view' },
    { page: 'expense_categories', action: 'edit' },
    { page: 'expense_reports', action: 'approve' },
    { page: 'trips', action: 'approve' },
    { page: 'support', action: 'edit' },
    { page: 'budgets', action: 'view' },
    { page: 'violation_center', action: 'view' },
    { page: 'analytics', action: 'view' }
  ]),
  finance: grantsToPermissions([
    ...EMPLOYEE_GRANTS,
    { page: 'expense_categories', action: 'view' },
    { page: 'expense_reports', action: 'approve' },
    { page: 'expense_reports', action: 'export' },
    { page: 'reimbursements', action: 'approve' },
    { page: 'support', action: 'edit' },
    { page: 'budgets', action: 'view' },
    { page: 'budgets', action: 'create' },
    { page: 'ocr_receipts', action: 'view' },
    { page: 'ocr_receipts', action: 'create' },
    { page: 'ocr_receipts', action: 'edit' },
    { page: 'violation_center', action: 'view' },
    { page: 'analytics', action: 'view' },
    { page: 'audit_logs', action: 'view' }
  ]),
  cfo: grantsToPermissions([
    ...EMPLOYEE_GRANTS,
    { page: 'expense_reports', action: 'approve' },
    { page: 'expense_reports', action: 'export' },
    { page: 'reimbursements', action: 'approve' },
    { page: 'support', action: 'edit' },
    { page: 'budgets', action: 'view' },
    { page: 'budgets', action: 'approve' },
    { page: 'ocr_receipts', action: 'view' },
    { page: 'ocr_receipts', action: 'create' },
    { page: 'ocr_receipts', action: 'edit' },
    { page: 'violation_center', action: 'view' },
    { page: 'analytics', action: 'view' },
    { page: 'analytics', action: 'export' },
    { page: 'audit_logs', action: 'view' }
  ])
};

export const useEffectiveAccess = () => {
  const user = useSelector((state) => state.auth.user);
  const userMode = useSelector((state) => state.ui.userMode) || user?.role || 'employee';
  const shouldFetch = Boolean(user?.role && user.role !== 'super_admin');
  const query = useGetMyAccessQuery(undefined, { skip: !shouldFetch });

  return useMemo(() => {
    if (user?.role === 'super_admin' || user?.role === 'company_admin') {
      return { permissions: null, pages: null, isLoading: false, isUnrestricted: true };
    }

    const permissions = query.data?.permissions ? { ...query.data.permissions } : {};
    const pages = query.data?.pages ? [...query.data.pages] : [];

    if (!query.data) {
      const defaultKeys = DEFAULT_PANEL_PAGES[userMode] || [];
      const defaultPermissions = DEFAULT_PANEL_PERMISSIONS[userMode] || {};
      defaultKeys.forEach((key) => {
        if (!permissions[key]) {
          permissions[key] = defaultPermissions[key] || { view: true };
        }
        if (!pages.some((p) => p.key === key)) {
          pages.push({ key, isActive: true });
        }
      });
    }

    return {
      permissions,
      pages,
      isLoading: query.isLoading || query.isFetching,
      isUnrestricted: false,
      refetch: query.refetch
    };
  }, [query.data, query.isFetching, query.isLoading, query.refetch, user?.role, userMode]);
};

export const usePermission = (page, action = 'view') => {
  const { permissions, isLoading, isUnrestricted } = useEffectiveAccess();
  if (isUnrestricted) return true;
  if (isLoading) return false;
  return Boolean(permissions?.[page]?.manage || permissions?.[page]?.[action]);
};

export const usePageAccess = (page) => usePermission(page, 'view');

export const Can = ({ page, action = 'view', children, fallback = null }) => {
  const allowed = usePermission(page, action);
  return allowed ? children : fallback;
};
