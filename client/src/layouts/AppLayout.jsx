import { AnimatePresence, motion } from 'framer-motion';
import { Bell, ChevronLeft, ChevronRight, LogOut, Moon, Search, Sun, UserCircle } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../redux/authSlice';
import { toggleDark, toggleSidebar, setUserMode } from '../redux/uiSlice';
import { employeeNavigation, financeNavigation, managerNavigation, navigation, superAdminNavigation } from '../constants/navigation';
import { useEffectiveAccess } from '../hooks/usePermissions';

export const AppLayout = () => {
  const dispatch = useDispatch();
  const { sidebarOpen, darkMode, userMode: rawUserMode } = useSelector((state) => state.ui);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const user = useSelector((state) => state.auth.user);
  const access = useEffectiveAccess();
  
  const userMode = rawUserMode || user?.role || 'employee';

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
    if (userMode === 'company_admin' || user?.role !== userMode) {
      items = items.filter((item) => !item.key || pageKeys.has(item.key));
    } else if (pageKeys.size > 0) {
      const extraCompanyPages = navigation.filter((item) => pageKeys.has(item.key) && !items.some((existing) => existing.path === item.path));
      items = [...items, ...extraCompanyPages];
    }
  }
              
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

        <nav className="mt-4 flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3">
          {items.map(({ label, path, icon: Icon }) => (
            <NavLink key={path} to={path} className={({ isActive }) => `group relative flex items-center transition-colors ${
              sidebarOpen 
                ? `flex-row gap-3 rounded-2xl px-4 py-3 ${isActive ? 'bg-brand-50 text-brand-700 shadow-sm dark:bg-slate-900 dark:text-brand-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white'}`
                : `flex-col justify-center gap-1.5 rounded-2xl py-3 ${isActive ? 'bg-brand-50 text-brand-700 dark:bg-slate-900 dark:text-brand-100' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900'}`
            }`}>
              <Icon className="h-5 w-5 shrink-0" />
              {sidebarOpen ? (
                <span className="text-sm font-medium whitespace-nowrap">{label}</span>
              ) : (
                <span className="text-[10px] font-medium tracking-wide text-center px-1 w-full truncate">{label}</span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className={`${sidebarOpen ? 'pl-64' : 'pl-20'} transition-all duration-300 min-h-screen flex flex-col max-w-full overflow-x-clip`}>
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
              <button className="btn-secondary px-2" onClick={() => setNotificationsOpen((value) => !value)}><Bell className="h-4 w-4" /></button>
              <button className="btn-secondary px-2" onClick={() => dispatch(toggleDark())}>{darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
              <button className="btn-secondary" onClick={() => setProfileOpen((value) => !value)}><UserCircle className="h-4 w-4" /> <span className="hidden sm:inline">{user?.name || 'User'}</span></button>
            </div>
            <AnimatePresence>
              {notificationsOpen && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="absolute right-28 top-12 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                  <p className="px-2 py-1 text-sm font-bold dark:text-white">Notifications</p>
                  {['Report awaiting manager approval', 'Budget reached 80% threshold', 'Receipt OCR completed'].map((item) => <div key={item} className="rounded-xl px-2 py-3 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800">{item}</div>)}
                </motion.div>
              )}
              {profileOpen && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="absolute right-0 top-12 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                  <div className="border-b border-slate-100 px-2 pb-3 dark:border-slate-800">
                    <p className="font-semibold text-slate-950 dark:text-white">{user?.name || 'User'}</p>
                    <p className="text-xs text-slate-500">{user?.email}</p>
                  </div>
                  <button className="mt-2 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800" onClick={() => dispatch(logout())}><LogOut className="h-4 w-4" /> Logout</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>
        <main className="p-[10px]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
