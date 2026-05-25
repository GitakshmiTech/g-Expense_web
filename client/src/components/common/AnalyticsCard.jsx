import { motion } from 'framer-motion';

export const AnalyticsCard = ({ title, value, caption, children }) => (
  <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="panel p-5">
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h2 className="font-bold text-slate-950 dark:text-white">{title}</h2>
        {caption && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{caption}</p>}
      </div>
      {value && <span className="chip">{value}</span>}
    </div>
    {children}
  </motion.section>
);
