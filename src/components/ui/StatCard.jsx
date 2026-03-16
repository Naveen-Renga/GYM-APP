// src/components/ui/StatCard.jsx
import { motion } from 'framer-motion';

const accentClasses = {
  green:  'stat-green shadow-glow-green/20',
  purple: 'stat-purple shadow-glow-purple/20',
  blue:   'stat-blue shadow-glow-blue/20',
  gold:   'stat-gold',
  red:    'stat-red',
};

export default function StatCard({ label, value, icon, accent = 'green', subtitle, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className={`glass-card p-5 ${accentClasses[accent]}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
          <p className="text-white text-3xl font-bold tracking-tight">{value ?? '—'}</p>
          {subtitle && <p className="text-slate-500 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className="text-2xl opacity-80">{icon}</div>
      </div>
    </motion.div>
  );
}
