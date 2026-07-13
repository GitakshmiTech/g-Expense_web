import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, LogOut, Moon, Search, Sun, UserCircle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useLocation, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { logout } from '../redux/authSlice';
import { toggleDark, toggleSidebar, setUserMode } from '../redux/uiSlice';
import { employeeNavigation, financeNavigation, managerNavigation, navigation, superAdminNavigation } from '../constants/navigation';
import { useEffectiveAccess } from '../hooks/usePermissions';
import { useOutsideClick } from '../hooks/useOutsideClick';
import { NotificationCenter } from '../components/common/NotificationCenter';
import { useSocket } from '../contexts/SocketContext';
import { api } from '../services/platform.service';

const normalizePath = (path = '') => (path.length > 1 ? path.replace(/\/$/, '') : path);

const targetPathForNotification = (notification = {}) => {
  const data = notification.data || {};
  if (notification.actionUrl) {
    const url = normalizePath(notification.actionUrl);
    if (url.startsWith('/expenses/')) {
      const status = data.status || '';
      const isFinance = status.includes('FINANCE') || status.includes('verified') || status.includes('approved') || notification.title?.toLowerCase().includes('finance') || notification.message?.toLowerCase().includes('finance');
      return isFinance ? '/finance/verification' : '/manager/pending-approvals';
    }
    return url;
  }
  if (data.kind === 'support_ticket') return '/support';
  if (data.kind === 'trip') return data.status?.includes('FINANCE') ? '/finance/verification' : '/manager/trips';
  if (data.kind === 'report') return '/manager/pending-approvals';
  if (data.kind === 'expense') return data.status?.includes('FINANCE') ? '/finance/verification' : '/manager/pending-approvals';
  return '/notifications';
};

const buildNavigationBadges = (notifications = [], items = []) => {
  const badgeByPath = {};
  const unread = notifications.filter((item) => !item.readAt && item.status !== 'read');
  unread.forEach((notification) => {
    const target = targetPathForNotification(notification);
    const match = items
      .filter((item) => {
        const path = normalizePath(item.path);
        if (path === '/') return target === '/';
        return target === path || target.startsWith(`${path}/`);
      })
      .sort((a, b) => normalizePath(b.path).length - normalizePath(a.path).length)[0];
    const badgePath = match?.path || (items.some((item) => item.path === '/notifications') ? '/notifications' : null);
    if (badgePath) badgeByPath[badgePath] = (badgeByPath[badgePath] || 0) + 1;
  });
  return badgeByPath;
};

export const AppLayout = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { sidebarOpen, darkMode, userMode: rawUserMode } = useSelector((state) => state.ui);
  const [profileOpen, setProfileOpen] = useState(false);
  const socket = useSocket();

  const handleLogout = () => {
    dispatch(logout());
  };

  const profileRef = useRef(null);

  const location = useLocation();

  const user = useSelector((state) => state.auth.user);
  
  if (user) {
    if (location.pathname.startsWith('/manager') && !['manager', 'company_admin', 'super_admin'].includes(user.role)) {
      return <Navigate to="/" replace />;
    }
    if (location.pathname.startsWith('/finance') && !['finance', 'cfo', 'company_admin', 'super_admin'].includes(user.role)) {
      return <Navigate to="/" replace />;
    }
  }

  useEffect(() => {
    let correctMode = rawUserMode || user?.role || 'employee';
    if (user) {
      if (['employee', 'company_admin', 'super_admin'].includes(user.role)) {
        correctMode = user.role;
      } else if (['manager', 'finance', 'cfo'].includes(user.role)) {
        if (correctMode !== 'employee' && correctMode !== user.role) {
          correctMode = user.role;
        }
      }
    }
    if (correctMode !== rawUserMode) {
      dispatch(setUserMode(correctMode));
    }
  }, [user, rawUserMode, dispatch]);

  useOutsideClick(profileRef, () => setProfileOpen(false));
  const access = useEffectiveAccess();
  
  let userMode = rawUserMode || user?.role || 'employee';
  if (user) {
    if (['employee', 'company_admin', 'super_admin'].includes(user.role)) {
      userMode = user.role;
    } else if (['manager', 'finance', 'cfo'].includes(user.role)) {
      if (userMode !== 'employee' && userMode !== user.role) {
        userMode = user.role;
      }
    }
  }



  let items = userMode === 'super_admin' ? superAdminNavigation 
            : userMode === 'manager' ? managerNavigation 
            : ['finance', 'cfo'].includes(userMode) ? financeNavigation 
            : userMode === 'employee' ? employeeNavigation 
            : navigation; // Fallback to full navigation for company_admin
            
  if (userMode === 'employee') {
    const isApprover = user?.role === 'manager' || ['finance', 'cfo'].includes(user?.role) || user?.permissions?.includes('approve_expense');
    if (!isApprover) {
      items = items.filter((item) => item.label !== 'My Approvals');
    }
  }

  if (!access.isUnrestricted && ['company_admin', 'manager', 'finance', 'cfo', 'employee'].includes(userMode)) {
    const pageKeys = new Set(access.pages.map((page) => page.key));
    const NAVIGATION_TO_PERMISSION_MAP = {
      team_expenses: 'expense_reports',
      approvals: 'expense_reports',
      verification: 'expense_reports',
      accounting: 'expense_reports',
      expenses: 'expense_reports',
    };

    items = items.filter((item) => {
      if (!item.key) return true;
      const permKey = NAVIGATION_TO_PERMISSION_MAP[item.key] || item.key;
      return pageKeys.has(permKey);
    });

    if (pageKeys.size > 0 && user?.role === userMode) {
      const extraCompanyPages = navigation.filter((item) => {
        const permKey = NAVIGATION_TO_PERMISSION_MAP[item.key] || item.key;
        return pageKeys.has(permKey) && !items.some((existing) => existing.key === item.key || existing.path === item.path || existing.label === item.label);
      });
      items = [...items, ...extraCompanyPages];
    }
  }

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: api.notifications,
    refetchInterval: 30000
  });

  useEffect(() => {
    if (!socket) return undefined;
    const refreshBadges = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });
    socket.on('notification:new', refreshBadges);
    return () => socket.off('notification:new', refreshBadges);
  }, [queryClient, socket]);

  const navigationBadges = buildNavigationBadges(Array.isArray(notifications) ? notifications : notifications.items || [], items);
              
  const productName = userMode === 'manager' ? 'Manager Panel' 
                    : ['finance', 'cfo'].includes(userMode) ? 'Finance Panel' 
                    : userMode === 'super_admin' ? 'Super Admin'
                    : 'GT Expense';

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-slate-950 dark:bg-slate-950">
      <aside className={`fixed inset-y-0 left-0 z-30 flex flex-col border-r border-slate-200 bg-white transition-all duration-300 dark:border-slate-800 dark:bg-slate-950 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className={`flex h-20 w-full items-center border-b border-slate-800/50 ${sidebarOpen ? 'px-4 justify-start gap-2' : 'justify-center relative'}`}>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center">
            <img src="/logo.png" alt="GT Logo" className="h-9 w-9 object-contain" />
          </div>
          {sidebarOpen && <span className="text-lg font-bold tracking-wide text-slate-950 dark:text-white">{productName}</span>}
        </div>
        
        {/* Sidebar Toggle Button at the Intersection */}
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="absolute -right-3 top-10 z-50 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <nav className="mt-4 flex-1 space-y-0 overflow-y-auto overflow-x-hidden">
          {items.map(({ label, path, icon: Icon }) => {
            const badgeCount = path === '/notifications' ? 0 : (navigationBadges[path] || 0);
            return (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => `group relative flex items-center transition-colors ${
                sidebarOpen 
                  ? `flex-row gap-4 py-4 pl-7 pr-4 ${isActive ? 'bg-brand-50/60 text-brand-700 dark:bg-slate-900/50 dark:text-brand-300' : 'text-slate-600 hover:bg-slate-50/80 dark:text-slate-400 dark:hover:bg-slate-900/50 dark:hover:text-slate-200'}`
                  : `flex-col justify-center gap-1 py-4 px-2 ${isActive ? 'bg-brand-50/60 text-brand-700 dark:bg-slate-900/50 dark:text-brand-300' : 'text-slate-500 hover:bg-slate-50/80 dark:text-slate-400 dark:hover:bg-slate-900/50 dark:hover:text-slate-200'}`
              }`}
            >
              {({ isActive }) => (
                <>
                  {isActive && <div className="absolute left-0 top-0 bottom-0 w-[5px] bg-brand-600 rounded-r-full" />}
                  <Icon className="h-5 w-5 shrink-0" />
                  {sidebarOpen ? (
                    <>
                      <span className="min-w-0 flex-1 text-[11px] font-bold tracking-wider uppercase whitespace-nowrap">{label}</span>
                      {badgeCount > 0 && (
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-950" title={`${badgeCount} pending update${badgeCount > 1 ? 's' : ''}`}>
                          {badgeCount > 9 ? '9+' : badgeCount}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="text-[9px] font-bold tracking-wider uppercase text-center px-1 w-full truncate">{label}</span>
                      {badgeCount > 0 && (
                        <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-950" title={`${badgeCount} pending update${badgeCount > 1 ? 's' : ''}`} />
                      )}
                    </>
                  )}
                </>
              )}
            </NavLink>
            );
          })}
        </nav>
      </aside>
      <div className={`${sidebarOpen ? 'pl-64' : 'pl-20'} transition-all duration-300 min-h-screen flex flex-col max-w-full`}>
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-6 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
          <div className="relative hidden w-full max-w-lg md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input bg-slate-50 pl-9" placeholder="Search expenses, reports, merchants, employees" />
          </div>
          <div className="relative ml-auto flex items-center gap-4">
            {/* View Switcher Badge */}
            {['manager', 'finance', 'cfo'].includes(user?.role) && (
              <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  onClick={() => {
                    dispatch(setUserMode('employee'));
                    window.location.href = '/';
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${userMode === 'employee' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  Employee Mode
                </button>
                <button
                  onClick={() => {
                    dispatch(setUserMode(user.role));
                    window.location.href = user.role === 'manager' ? '/manager' : '/finance';
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${userMode !== 'employee' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  {user.role === 'manager' ? 'Manager Mode' : 'Finance Mode'}
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <NotificationCenter />

              <button className="btn-secondary px-2" onClick={() => dispatch(toggleDark())}>{darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>

              <div ref={profileRef} className="relative">
                <button className="btn-secondary flex items-center gap-2" onClick={() => setProfileOpen((value) => !value)}><UserCircle className="h-4 w-4" /> <span className="hidden sm:inline">{user?.name || 'User'}</span></button>
                <AnimatePresence>
                  {profileOpen && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="absolute right-0 top-12 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-50">
                      <div className="border-b border-slate-100 px-2 pb-3 dark:border-slate-800">
                        <p className="font-semibold text-slate-950 dark:text-white">{user?.name || 'User'}</p>
                        <p className="text-xs text-slate-500">{user?.email}</p>
                      </div>
                      <button className="mt-2 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800" onClick={handleLogout}><LogOut className="h-4 w-4" /> Logout</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>
        <main className="p-[10px]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
