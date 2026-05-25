import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

export const Modal = ({ open, title, description, onClose, children, footer }) => (
  <AnimatePresence>
    {open && (
      <div className="fixed inset-0 z-50 grid place-items-center p-4">
        <motion.button className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
        <motion.div initial={{ scale: 0.96, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0, y: 12 }} className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
          <div className="flex items-start justify-between border-b border-slate-200 p-5 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">{title}</h2>
              {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
            </div>
            <button className="btn-secondary px-2" onClick={onClose}><X className="h-4 w-4" /></button>
          </div>
          <div className="p-5">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-slate-200 p-5 dark:border-slate-800">{footer}</div>}
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);
