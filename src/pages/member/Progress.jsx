// src/pages/member/Progress.jsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, doc, getDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { saveMemberFeedback, getMemberFeedback } from '../../firebase/firestore';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 text-sm z-50">
        <p className="text-slate-400 mb-1">{label}</p>
        <p className="text-neon-green font-bold text-lg">{payload[0].value} <span className="text-xs font-normal text-slate-400">sessions</span></p>
      </div>
    );
  }
  return null;
};

export default function MemberProgress() {
  const { user, profile } = useAuth();
  const [chartData, setChartData] = useState([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [notes, setNotes] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingFeedback, setSavingFeedback] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Load static data
    const loadStatic = async () => {
      try {
        const [nDoc, fDoc] = await Promise.all([
          getDoc(doc(db, 'memberNotes', user.uid)),
          getMemberFeedback(user.uid)
        ]);
        if (nDoc.exists()) setNotes(nDoc.data());
        if (fDoc.exists()) setFeedback(fDoc.data().text || '');
      } catch (e) { console.error("Error loading static data:", e); }
    };
    loadStatic();

    // Real-time attendance listener
    const q = query(
      collection(db, 'attendance'),
      where('memberId', '==', user.uid),
      where('status', '==', 'present')
      // Removed orderBy to avoid missing composite index error
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      let records = snap.docs.map(d => d.data());
      
      // Sort in-memory: Latest first
      records.sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date || 0);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date || 0);
        return dateB - dateA;
      });

      setTotalSessions(records.length);

      // Group by month
      const monthlyData = {};
      for (let i = 4; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
        monthlyData[key] = { month: key, sessions: 0 };
      }

      records.forEach(r => {
        if (!r.date) return;
        // Handle both string dates and Firestore Timestamps
        const dt = typeof r.date === 'string' ? new Date(r.date) : r.date.toDate();
        const key = dt.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
        if (monthlyData[key]) {
          monthlyData[key].sessions++;
        }
      });

      setChartData(Object.values(monthlyData));
      setLoading(false);
    }, (err) => {
      console.error("Attendance listener error:", err);
      toast.error("Failed to sync attendance data");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSaveFeedback = async () => {
    if (!profile?.mentorId) {
      toast.error('No mentor assigned yet.');
      return;
    }
    setSavingFeedback(true);
    try {
      await saveMemberFeedback(user.uid, profile.mentorId, feedback);
      toast.success('Feedback sent to mentor!');
    } catch (e) {
      toast.error('Failed to send feedback');
    } finally {
      setSavingFeedback(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white text-2xl font-bold">My Progress</h1>
        <p className="text-slate-400 text-sm mt-1">Track your fitness journey</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-6 border-gold/20 flex flex-col items-center justify-center min-h-[200px]">
           <div className="text-center">
             <div className="w-24 h-24 rounded-full border-4 border-neon-green/30 flex items-center justify-center text-4xl mx-auto mb-4 bg-neon-green/5 shadow-[0_0_30px_rgba(0,245,160,0.1)]">
               🏆
             </div>
             <p className="text-slate-400 font-medium">Total Sessions Attended</p>
             <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-neon-blue mt-2">
               {loading ? '...' : totalSessions}
             </h2>
           </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
          <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
            📊 Attendance History (Last 5 Months)
          </h3>
          {loading ? (
             <div className="h-48 animate-pulse bg-slate-800/50 rounded-xl" />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} content={<CustomTooltip />} />
                  <Bar dataKey="sessions" fill="url(#colorNeonGreen)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  <defs>
                    <linearGradient id="colorNeonGreen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00F5A0" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#00F5A0" stopOpacity={0.2}/>
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mentor's Feedback */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
          <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
             <span>📝</span> Feedback from your Mentor
          </h3>
          {loading ? (
            <div className="h-24 animate-pulse bg-slate-800/50 rounded-xl" />
          ) : notes?.progress ? (
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
               <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                 {notes.progress}
               </p>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 bg-white/[0.02] rounded-xl border border-white/[0.02]">
              <p className="text-xs">No feedback from mentor yet.</p>
            </div>
          )}
        </motion.div>

        {/* Member's Feedback to Mentor */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
          <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
             <span>💬</span> Send Feedback to Mentor
          </h3>
          <div className="space-y-4">
            <textarea
              className="form-input min-h-[120px] resize-y text-sm"
              placeholder="Tell your mentor how you're feeling, any pains, or progress..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
            <button
              onClick={handleSaveFeedback}
              disabled={savingFeedback || loading}
              className="btn-neon w-full py-3"
            >
              {savingFeedback ? 'Sending...' : 'Send Feedback'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
