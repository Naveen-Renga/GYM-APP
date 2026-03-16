// src/pages/member/Attendance.jsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { getMemberAttendance } from '../../firebase/firestore';

export default function MemberAttendance() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const snap = await getMemberAttendance(user.uid);
        const sortedAtt = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => b.date.localeCompare(a.date));
        setAttendance(sortedAtt);
      } catch (e) {
        console.error('Failed to load attendance:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white text-2xl font-bold">Attendance History</h1>
        <p className="text-slate-400 text-sm mt-1">Track your consistency and presence</p>
      </div>

      <div className="glass-card p-6">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-800/50 rounded-xl animate-pulse" />)}
          </div>
        ) : attendance.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📅</div>
            <h3 className="text-white font-medium mb-2">No Records Yet</h3>
            <p className="text-slate-400 text-sm">Your attendance records will appear here once marked by your mentor.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((rec, i) => (
                  <motion.tr key={rec.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
                    <td className="text-white font-medium">{formatDate(rec.date)}</td>
                    <td className="text-slate-400 text-xs">{new Date(rec.date).toLocaleDateString('en-IN', { weekday: 'long' })}</td>
                    <td>
                      <span className={`badge ${rec.status === 'present' ? 'badge-success' : 'badge-danger'}`}>
                        {rec.status.toUpperCase()}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && attendance.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-6 bg-gradient-to-br from-neon-green/10 to-transparent border-neon-green/20">
            <p className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-1">Consistency</p>
            <h4 className="text-white text-3xl font-black">
              {Math.round((attendance.filter(r => r.status === 'present').length / attendance.length) * 100)}%
            </h4>
            <p className="text-slate-500 text-xs mt-1">Attendance rate across all records</p>
          </div>
          <div className="glass-card p-6 bg-gradient-to-br from-neon-blue/10 to-transparent border-neon-blue/20">
            <p className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-1">Total Days</p>
            <h4 className="text-white text-3xl font-black">{attendance.filter(r => r.status === 'present').length}</h4>
            <p className="text-slate-500 text-xs mt-1">Days marked as present</p>
          </div>
        </div>
      )}
    </div>
  );
}
