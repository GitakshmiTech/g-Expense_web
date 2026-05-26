import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

export const Drawer = ({ open, title, description, onClose, children, footer, className = 'max-w-2xl' }) => (
  <AnimatePresence>
    {open && (
      <div className="fixed inset-0 z-50 flex justify-end">
        <motion.button
          aria-label="Close drawer backdrop"
          className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
        <motion.aside
          initial={{ x: 600, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 600, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          className={`relative flex h-full w-full flex-col bg-white shadow-2xl dark:bg-slate-900 ${className}`}
        >
          <header className="flex items-start justify-between border-b border-slate-200 p-6 dark:border-slate-800">
            <div>
              <h2 className="text-xl font-bold text-slate-950 dark:text-white">{title}</h2>
              {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
            </div>
            <button className="btn-secondary px-2" onClick={onClose}><X className="h-4 w-4" /></button>
          </header>
          <div className="flex-1 overflow-y-auto p-6">{children}</div>
          {footer && <footer className="border-t border-slate-200 p-5 dark:border-slate-800">{footer}</footer>}
        </motion.aside>
      </div>
    )}
  </AnimatePresence>
);
