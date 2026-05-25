import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useGetMyAccessQuery } from '../redux/rbacApi';

export const useEffectiveAccess = () => {
  const user = useSelector((state) => state.auth.user);
  const shouldFetch = Boolean(user?.role && user.role !== 'super_admin');
  const query = useGetMyAccessQuery(undefined, { skip: !shouldFetch });

  return useMemo(() => {
    if (user?.role === 'super_admin' || user?.role === 'company_admin') {
      return { permissions: null, pages: null, isLoading: false, isUnrestricted: true };
    }
    return {
      permissions: query.data?.permissions || {},
      pages: query.data?.pages || [],
      isLoading: query.isLoading || query.isFetching,
      isUnrestricted: false,
      refetch: query.refetch
    };
  }, [query.data, query.isFetching, query.isLoading, query.refetch, user?.role]);
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
