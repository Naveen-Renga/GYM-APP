// src/pages/mentor/Schedule.jsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { getMentorBookings, updateBookingStatus } from '../../firebase/firestore';
import { db } from '../../firebase/config';
import { getDocs, collection, query, where, getDoc, doc } from 'firebase/firestore';

export default function MentorSchedule() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const snap = await getMentorBookings(user.uid);
      const allBookings = await Promise.all(snap.docs.map(async d => {
        const b = d.data();
        let memberName = 'Unknown';
        try {
          const uDoc = await getDoc(doc(db, 'users', b.memberId));
          if (uDoc.exists()) memberName = uDoc.data().name;
        } catch {}
        return { id: d.id, ...b, memberName };
      }));

      // Filter: only accepted status
      // Sort: date ascending, then time ascending
      const filteredAndSorted = allBookings
        .filter(b => b.status === 'accepted')
        .sort((a, b) => {
          const dateCompare = (a.date || '').localeCompare(b.date || '');
          if (dateCompare !== 0) return dateCompare;
          return (a.time || '').localeCompare(b.time || '');
        });

      setBookings(filteredAndSorted);
    } catch (e) { 
      console.error(e);
      // No toast error here per requirements, just set empty if fail
      setBookings([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { if (user) load(); }, [user]);

  const handleUpdate = async (id, status) => {
    if (status === 'cancelled' && !confirm('Cancel this session?')) return;
    try {
      await updateBookingStatus(id, status);
      toast.success(`Session ${status}`);
      load();
    } catch (e) { toast.error(e.message); }
  };

  const isToday = (dateStr) => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  };

  const isPast = (dateStr) => {
    return dateStr && new Date(dateStr) < new Date(new Date().toISOString().split('T')[0]);
  };

  const statusBadge = (s) => {
    const m = { confirmed: 'badge-success', pending: 'badge-warning', cancelled: 'badge-danger', completed: 'badge-blue' };
    return m[s] || 'badge-gray';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white text-2xl font-bold">My Schedule</h1>
        <p className="text-slate-400 text-sm mt-1">Manage booking requests</p>
      </div>

      <div className="glass-card p-6">
        {loading ? (
          <div className="text-center py-8 text-slate-400">Loading schedule...</div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📅</div>
            <p className="text-slate-400">No sessions scheduled</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Date & Time</th><th>Member</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {bookings.map((b, i) => (
                  <motion.tr key={b.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                    <td>
                      <div className="font-medium flex items-center gap-2">
                        {b.date}
                        {isToday(b.date) && <span className="badge badge-success text-xs">Today</span>}
                      </div>
                      <div className="text-slate-500 text-xs">{b.time}</div>
                    </td>
                    <td className="text-slate-300">{b.memberName}</td>
                    <td className="text-slate-400">{b.sessionType}</td>
                    <td><span className={`badge ${statusBadge(b.status)}`}>{b.status?.toUpperCase()}</span></td>
                    <td>
                      <div className="flex items-center gap-2 flex-wrap">
                        {b.status === 'pending' && (
                          <button onClick={() => handleUpdate(b.id, 'confirmed')}
                            className="px-3 py-1.5 text-xs bg-neon-green/10 text-neon-green border border-neon-green/20 rounded-lg hover:bg-neon-green/20 transition-all">
                            ✓ Accept
                          </button>
                        )}
                        {b.status === 'confirmed' && isPast(b.date) && (
                          <button onClick={() => handleUpdate(b.id, 'completed')}
                            className="px-3 py-1.5 text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-all">
                            ✓ Done
                          </button>
                        )}
                        {(b.status === 'pending' || b.status === 'confirmed') && (
                          <button onClick={() => handleUpdate(b.id, 'cancelled')}
                            className="btn-danger px-2 py-1 text-xs">
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
