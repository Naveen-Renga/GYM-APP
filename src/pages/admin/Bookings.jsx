// src/pages/admin/Bookings.jsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { getAllBookings } from '../../firebase/firestore';
import { db } from '../../firebase/config';
import { getDocs, collection } from 'firebase/firestore';

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userMap, setUserMap] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const [bSnap, uSnap] = await Promise.all([getAllBookings(), getDocs(collection(db, 'users'))]);
        const map = {};
        uSnap.docs.forEach(d => (map[d.id] = d.data().name));
        setUserMap(map);
        setBookings(bSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { toast.error('Failed to load bookings'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const statusBadge = (s) => {
    const map = { confirmed: 'badge-success', pending: 'badge-warning', cancelled: 'badge-danger', completed: 'badge-blue' };
    return map[s] || 'badge-gray';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white text-2xl font-bold">Bookings</h1>
        <p className="text-slate-400 text-sm mt-1">All session bookings</p>
      </div>

      <div className="glass-card p-6">
        {loading ? (
          <div className="text-center py-8 text-slate-400">Loading bookings...</div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📅</div>
            <p className="text-slate-400">No bookings yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Date & Time</th><th>Member</th><th>Mentor</th><th>Type</th><th>Status</th></tr></thead>
              <tbody>
                {bookings.map((b, i) => (
                  <motion.tr key={b.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                    <td>
                      <div className="font-medium">{b.date}</div>
                      <div className="text-slate-500 text-xs">{b.time}</div>
                    </td>
                    <td>{userMap[b.memberId] || 'Unknown'}</td>
                    <td>{userMap[b.mentorId] || 'Unknown'}</td>
                    <td className="text-slate-300">{b.sessionType}</td>
                    <td><span className={`badge ${statusBadge(b.status)}`}>{b.status}</span></td>
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
