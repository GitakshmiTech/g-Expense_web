import { motion } from 'framer-motion';

export const StatCard = ({ label, value, icon: Icon, tone = 'brand' }) => (
  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -3 }} className="panel overflow-hidden p-5">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">{value}</p>
      </div>
      {Icon && (
        <div className={`rounded-2xl p-3 ${tone === 'green' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950' : tone === 'amber' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950' : tone === 'rose' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950' : 'bg-brand-50 text-brand-600 dark:bg-slate-800'}`}>
          <Icon className="h-6 w-6" />
        </div>
      )}
    </div>
    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div className={`h-full w-2/3 rounded-full ${tone === 'green' ? 'bg-emerald-500' : tone === 'amber' ? 'bg-amber-500' : tone === 'rose' ? 'bg-rose-500' : 'bg-brand-600'}`} />
    </div>
  </motion.div>
);
