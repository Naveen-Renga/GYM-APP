// src/pages/member/WorkoutPlan.jsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function MemberWorkoutPlan() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'workoutPlans'), where('memberId', '==', user.uid)));
        setPlans(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white text-2xl font-bold">My Workout Plans</h1>
        <p className="text-slate-400 text-sm mt-1">Structured programs assigned by your mentor</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6">
          <div className="h-64 animate-pulse bg-slate-800/50 rounded-xl" />
        </div>
      ) : plans.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <div className="text-5xl mb-4">🏋️</div>
          <h3 className="text-white font-medium mb-2">No Plans Yet</h3>
          <p className="text-slate-400 text-sm">Your mentor hasn't assigned any structured workout plans to you yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {plans.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card overflow-hidden">
              <div className="p-5 border-b border-white/[0.05] bg-gradient-to-r from-neon-blue/10 to-transparent">
                <h3 className="text-xl font-bold text-white mb-1">{p.title}</h3>
                <p className="text-slate-400 text-xs">{(p.exercises || []).length} exercises in this program</p>
              </div>
              
              <div className="p-5 overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300 min-w-[500px]">
                  <thead>
                    <tr className="border-b border-white/[0.05] text-slate-400">
                      <th className="pb-3 font-medium uppercase tracking-wider text-xs w-10">No.</th>
                      <th className="pb-3 font-medium uppercase tracking-wider text-xs">Exercise / Day focus</th>
                      <th className="pb-3 font-medium uppercase tracking-wider text-xs w-24 text-center">Sets</th>
                      <th className="pb-3 font-medium uppercase tracking-wider text-xs w-24 text-center">Reps</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    {(p.exercises || []).map((ex, j) => (
                      <tr key={j} className="hover:bg-white/[0.01]">
                        <td className="py-3 text-neon-blue/70 font-mono">{String(j + 1).padStart(2, '0')}</td>
                        <td className="py-3 font-medium text-white">{ex.day || '—'}</td>
                        <td className="py-3 text-center">{ex.sets || '—'}</td>
                        <td className="py-3 text-center">{ex.reps || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
