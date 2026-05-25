import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const ToastItem = ({ id, message, type = 'info', onClose }) => {
  const config = {
    success: {
      bg: 'bg-emerald-50/90 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800/60',
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />,
      progress: 'bg-emerald-500'
    },
    error: {
      bg: 'bg-rose-50/90 dark:bg-rose-950/80 border-rose-200 dark:border-rose-800/60',
      icon: <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />,
      progress: 'bg-rose-500'
    },
    warning: {
      bg: 'bg-amber-50/90 dark:bg-amber-950/80 border-amber-200 dark:border-amber-800/60',
      icon: <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />,
      progress: 'bg-amber-500'
    },
    info: {
      bg: 'bg-blue-50/90 dark:bg-blue-950/80 border-blue-200 dark:border-blue-800/60',
      icon: <Info className="h-5 w-5 text-blue-500 shrink-0" />,
      progress: 'bg-blue-500'
    }
  }[type] || {
    bg: 'bg-white/90 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800/60',
    icon: <Info className="h-5 w-5 text-slate-500 shrink-0" />,
    progress: 'bg-slate-500'
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.9, x: 80 }}
      animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9, x: 120, transition: { duration: 0.2 } }}
      className={`relative overflow-hidden flex items-start gap-3 w-80 p-4 rounded-xl border backdrop-blur-md shadow-xl pointer-events-auto ${config.bg}`}
    >
      <div className="mt-0.5">{config.icon}</div>
      <div className="flex-1 text-sm font-semibold text-slate-800 dark:text-slate-100 break-words pr-2">
        {message}
      </div>
      <button
        onClick={() => onClose(id)}
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors shrink-0"
      >
        <X className="h-4 w-4" />
      </button>
      
      {/* Progress bar */}
      <motion.div
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: 4, ease: 'linear' }}
        className={`absolute bottom-0 left-0 h-1 ${config.progress}`}
      />
    </motion.div>
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    // Generate unique ID
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Listen for global custom events to trigger toasts from outside React component tree
  useEffect(() => {
    const handleGlobalToast = (event) => {
      const { message, type } = event.detail || {};
      if (message) {
        showToast(message, type);
      }
    };
    window.addEventListener('app-toast', handleGlobalToast);
    return () => window.removeEventListener('app-toast', handleGlobalToast);
  }, [showToast]);

  const toast = {
    success: (msg) => showToast(msg, 'success'),
    error: (msg) => showToast(msg, 'error'),
    info: (msg) => showToast(msg, 'info'),
    warning: (msg) => showToast(msg, 'warning')
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence mode="pop-layout">
          {toasts.map((t) => (
            <ToastItem key={t.id} id={t.id} message={t.message} type={t.type} onClose={removeToast} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
