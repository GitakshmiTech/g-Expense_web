import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { AccessDenied } from '../pages/AccessDenied';
import { useEffectiveAccess } from '../hooks/usePermissions';

export const ProtectedRoute = ({ children }) => {
  const token = useSelector((state) => state.auth.accessToken);
  return token ? children : <Navigate to="/login" replace />;
};

export const ProtectedPage = ({ page, children }) => {
  const { permissions, isLoading, isUnrestricted } = useEffectiveAccess();
  if (isLoading) return <div className="p-6 text-sm text-slate-500">Checking access...</div>;
  const allowed = isUnrestricted || permissions?.[page]?.view || permissions?.[page]?.manage;
  return allowed ? children : <AccessDenied />;
};
