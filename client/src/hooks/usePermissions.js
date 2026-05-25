import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useGetMyAccessQuery } from '../redux/rbacApi';

const DEFAULT_PANEL_PAGES = {
  employee: ['dashboard', 'expense_reports', 'trips', 'reimbursements', 'notifications', 'settings'],
  manager: ['dashboard', 'expense_reports', 'trips', 'budgets', 'violation_center', 'analytics', 'notifications', 'settings'],
  finance: ['dashboard', 'expense_reports', 'reimbursements', 'budgets', 'analytics', 'notifications', 'audit_logs', 'settings'],
  cfo: ['dashboard', 'expense_reports', 'reimbursements', 'budgets', 'analytics', 'notifications', 'audit_logs', 'settings']
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

    const permissions = { ...query.data?.permissions };
    const pages = [...(query.data?.pages || [])];

    const defaultKeys = DEFAULT_PANEL_PAGES[userMode] || [];
    defaultKeys.forEach((key) => {
      if (!permissions[key]) {
        permissions[key] = { view: true, create: true, edit: true, delete: true, manage: true };
      }
      if (!pages.some((p) => p.key === key)) {
        pages.push({ key, isActive: true });
      }
    });

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
