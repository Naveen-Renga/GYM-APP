// src/pages/admin/Payments.jsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { getAllPayments } from '../../firebase/firestore';
import { db } from '../../firebase/config';
import { getDocs, collection } from 'firebase/firestore';

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userMap, setUserMap] = useState({});
  const [planMap, setPlanMap] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const [pSnap, uSnap, plSnap] = await Promise.all([
          getAllPayments(),
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'plans'))
        ]);
        const uMap = {}; uSnap.docs.forEach(d => (uMap[d.id] = d.data().name));
        const plMap = {}; plSnap.docs.forEach(d => (plMap[d.id] = d.data().name));
        setUserMap(uMap); setPlanMap(plMap);
        setPayments(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { toast.error('Failed to load payments'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const formatDate = (ts) => {
    if (!ts) return '—';
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const totalRevenue = payments.reduce((s, p) => s + Number(p.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Payments</h1>
          <p className="text-slate-400 text-sm mt-1">Transaction history</p>
        </div>
        <div className="glass-card px-6 py-3 text-right">
          <p className="text-slate-400 text-xs">Total Revenue</p>
          <p className="text-neon-green text-xl font-bold">₹{totalRevenue.toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div className="glass-card p-6">
        {loading ? (
          <div className="text-center py-8 text-slate-400">Loading payments...</div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">💳</div>
            <p className="text-slate-400">No payments recorded</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Date</th><th>Member</th><th>Plan</th><th>Amount</th><th>Method</th><th>Status</th></tr></thead>
              <tbody>
                {payments.map((p, i) => (
                  <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                    <td>{formatDate(p.date)}</td>
                    <td>{userMap[p.memberId] || 'Unknown'}</td>
                    <td>{planMap[p.planId] || '—'}</td>
                    <td className="text-neon-green font-semibold">₹{Number(p.amount || 0).toLocaleString('en-IN')}</td>
                    <td className="text-slate-300">{p.method || '—'}</td>
                    <td><span className="badge badge-success">Completed</span></td>
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
