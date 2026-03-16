// src/pages/admin/Dashboard.jsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import StatCard from '../../components/ui/StatCard';
import { getAdminStats, getAllBookings, getAllPayments } from '../../firebase/firestore';

const revenueData = [
  { month: 'Jan', revenue: 12000 },
  { month: 'Feb', revenue: 19000 },
  { month: 'Mar', revenue: 15000 },
  { month: 'Apr', revenue: 22000 },
  { month: 'May', revenue: 28000 },
  { month: 'Jun', revenue: 34000 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 text-sm">
        <p className="text-slate-400">{label}</p>
        <p className="text-neon-green font-semibold">₹{payload[0].value.toLocaleString('en-IN')}</p>
      </div>
    );
  }
  return null;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, bookSnap] = await Promise.all([getAdminStats(), getAllBookings()]);
        setStats(s);
        setRecentBookings(bookSnap.docs.slice(0, 6).map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const formatINR = (v) => '₹' + Number(v || 0).toLocaleString('en-IN');

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Members" value={loading ? '...' : stats?.totalMembers} icon="👥" accent="blue" index={0} />
        <StatCard label="Active Members" value={loading ? '...' : stats?.activeMembers} icon="✅" accent="green" index={1} />
        <StatCard label="Mentors" value={loading ? '...' : stats?.totalMentors} icon="🏅" accent="gold" index={2} />
        <StatCard label="Revenue (Month)" value={loading ? '...' : formatINR(stats?.monthRevenue)} icon="₹" accent="purple" index={3} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="glass-card p-6 xl:col-span-2"
        >
          <h3 className="text-white font-semibold mb-5">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={revenueData}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="revenue" stroke="#00F5A0" strokeWidth={2.5} dot={{ fill: '#00F5A0', r: 4 }} activeDot={{ r: 6, fill: '#00F5A0' }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Recent Bookings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="glass-card p-6"
        >
          <h3 className="text-white font-semibold mb-5">Recent Bookings</h3>
          {recentBookings.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">No bookings yet</div>
          ) : (
            <div className="space-y-3">
              {recentBookings.map((b) => (
                <div key={b.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                  <div>
                    <p className="text-slate-300 text-sm font-medium">{b.sessionType || 'Booking'}</p>
                    <p className="text-slate-500 text-xs">{b.date}</p>
                  </div>
                  <span className={`badge ${b.status === 'confirmed' ? 'badge-success' : b.status === 'cancelled' ? 'badge-danger' : 'badge-warning'}`}>
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
