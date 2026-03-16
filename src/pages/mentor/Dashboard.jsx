// src/pages/mentor/Dashboard.jsx
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import StatCard from '../../components/ui/StatCard';
import { useAuth } from '../../context/AuthContext';
import { getMentorStats, getMentorBookings, getPendingBookings, updateBookingStatus, getMentorFeedbacks, markFeedbackAsSeen } from '../../firebase/firestore';
import { db } from '../../firebase/config';
import { getDocs, getDoc, collection, query, where, doc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function MentorDashboard() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState(null);
  const [todayBookings, setTodayBookings] = useState([]);
  const [recentStudents, setRecentStudents] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPendingRequests = useCallback(async () => {
    if (!user) return;
    try {
      const pSnap = await getPendingBookings(user.uid);
      const requests = await Promise.all(
        pSnap.docs.map(async (d) => {
          const data = { id: d.id, ...d.data() };
          // Fetch member name from users collection
          try {
            const memberDoc = await getDoc(doc(db, 'users', data.memberId));
            data.memberName = memberDoc.exists() ? memberDoc.data().name : data.memberId?.slice(-6) || 'Unknown';
          } catch {
            data.memberName = data.memberId?.slice(-6) || 'Unknown';
          }
          return data;
        })
      );
      setPendingRequests(requests);
    } catch (e) {
      console.error('Failed to load pending requests:', e);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // 1. Fetch Students (Priority)
      try {
        const uSnap = await getDocs(query(
          collection(db, 'users'),
          where('mentorId', '==', user.uid),
          where('role', '==', 'member')
        ));
        setRecentStudents(uSnap.docs.slice(0, 5).map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error('Failed to load students:', e);
      }

      // 2. Fetch Stats
      try {
        const s = await getMentorStats(user.uid);
        setStats(s);
      } catch (e) {
        console.error('Failed to load stats:', e);
      }

      // 3. Fetch Bookings (Today's Schedule)
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const bSnap = await getMentorBookings(user.uid);
        const allB = bSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        const todayAccepted = await Promise.all(
          allB
            .filter(b => b.date === todayStr && b.status === 'accepted')
            .map(async b => {
              try {
                const uDoc = await getDoc(doc(db, 'users', b.memberId));
                return { ...b, memberName: uDoc.exists() ? uDoc.data().name : 'Unknown' };
              } catch {
                return { ...b, memberName: 'Unknown' };
              }
            })
        );

        setTodayBookings(todayAccepted.sort((a, b) => (a.time || '').localeCompare(b.time || '')));
      } catch (e) {
        console.error('Failed to load bookings:', e);
      }

      // 4. Fetch Pending Requests
      await loadPendingRequests();

      // 5. Fetch Member Feedbacks
      try {
        const fSnap = await getMentorFeedbacks(user.uid);
        const feedbackList = await Promise.all(fSnap.docs.map(async (d) => {
          const data = { id: d.id, ...d.data() };
          try {
            const mDoc = await getDoc(doc(db, 'users', data.memberId));
            data.memberName = mDoc.exists() ? mDoc.data().name : 'Unknown';
          } catch { data.memberName = 'Unknown'; }
          return data;
        }));
        setFeedbacks(feedbackList.sort((a,b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0)));
      } catch (e) {
        console.error('Failed to load feedbacks:', e);
      }

      setLoading(false);
    };
    load();
  }, [user, loadPendingRequests]);

  const handleRequestAction = async (bookingId, action) => {
    try {
      await updateBookingStatus(bookingId, action === 'accept' ? 'accepted' : 'rejected');
      toast.success(`Booking ${action === 'accept' ? 'accepted' : 'rejected'}!`);
      // Refresh pending list and stats
      await loadPendingRequests();
      try { setStats(await getMentorStats(user.uid)); } catch {}
    } catch (e) {
      toast.error('Failed to update booking status');
      console.error(e);
    }
  };

  const handleFeedbackSeen = async (memberId) => {
    try {
      await markFeedbackAsSeen(memberId);
      setFeedbacks(feedbacks.map(f => f.memberId === memberId ? { ...f, mentorSeen: true } : f));
      toast.success('Feedback marked as seen');
    } catch (e) {
      toast.error('Failed to update feedback status');
    }
  };

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 bg-gradient-to-r from-amber-500/10 to-neon-green/5 border-amber-500/20"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white text-xl font-bold">Welcome back, {profile?.name} 👋</h2>
            <p className="text-slate-400 text-sm mt-1">{today}</p>
          </div>
          <div className="text-4xl">🏋️</div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="My Students" value={loading ? '...' : stats?.myStudents} icon="👥" accent="blue" index={0} />
        <StatCard label="Today's Sessions" value={loading ? '...' : stats?.todaySessions} icon="📅" accent="gold" index={1} />
        <StatCard label="Pending Requests" value={loading ? '...' : (pendingRequests.length || stats?.pendingRequests)} icon="🔔" accent="red" index={2} />
        <StatCard label="Completed (Month)" value={loading ? '...' : stats?.monthCompleted} icon="✅" accent="green" index={3} />
      </div>

      {/* Pending Requests Section */}
      {!loading && pendingRequests.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="glass-card p-6 border-amber-500/20"
        >
          <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
            <span>🔔</span> Pending Requests
            <span className="ml-2 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30">
              {pendingRequests.length}
            </span>
          </h3>
          <div className="space-y-3">
            {pendingRequests.map(req => (
              <div key={req.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {(req.memberName || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-300 text-sm font-medium">{req.memberName}</p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    📅 {req.date} &nbsp;•&nbsp; ⏰ {req.time || '—'} &nbsp;•&nbsp; {req.sessionType || 'Session'}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleRequestAction(req.id, 'accept')}
                    className="px-4 py-1.5 rounded-lg bg-neon-green/20 text-neon-green text-xs font-semibold border border-neon-green/30 hover:bg-neon-green/30 transition-all"
                  >
                    ✓ Accept
                  </button>
                  <button
                    onClick={() => handleRequestAction(req.id, 'reject')}
                    className="px-4 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/30 hover:bg-red-500/30 transition-all"
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Member Feedback "Board" */}
      {!loading && feedbacks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="glass-card p-6 border-neon-blue/20"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <span>💬</span> Member Feedbacks
              <span className="ml-2 px-2 py-0.5 rounded-full bg-neon-blue/20 text-neon-blue text-xs font-bold border border-neon-blue/30">
                {feedbacks.filter(f => !f.mentorSeen).length} New
              </span>
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {feedbacks.map(fb => (
              <div key={fb.id} className={`p-4 rounded-xl border transition-all ${fb.mentorSeen ? 'bg-white/[0.02] border-white/5' : 'bg-neon-blue/5 border-neon-blue/20 shadow-[0_0_15px_rgba(0,163,255,0.05)]'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center text-[10px] font-bold text-white">
                      {(fb.memberName || '?').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-white text-sm font-medium">{fb.memberName}</span>
                  </div>
                  {!fb.mentorSeen ? (
                    <button 
                      onClick={() => handleFeedbackSeen(fb.memberId)}
                      className="text-[10px] text-neon-green hover:underline uppercase font-bold"
                    >
                      Mark as Seen
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Read ✅</span>
                  )}
                </div>
                <p className="text-slate-400 text-xs italic line-clamp-2 leading-relaxed">
                  "{fb.text}"
                </p>
                <div className="text-[9px] text-slate-600 mt-2 flex justify-between">
                  <span>{fb.updatedAt?.toDate().toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="glass-card p-6"
        >
          <h3 className="text-white font-semibold mb-5">Today's Schedule</h3>
          {todayBookings.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <div className="text-3xl mb-2">☀️</div>
              <p>No sessions scheduled today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayBookings.map(b => (
                <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                  <div className="text-neon-green font-mono text-sm font-semibold w-16 flex-shrink-0">{b.time}</div>
                  <div className="flex-1">
                    <p className="text-slate-300 text-sm">{b.sessionType}</p>
                    <p className="text-slate-500 text-xs">{b.memberName}</p>
                  </div>
                  <span className="badge badge-success">Accepted</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="glass-card p-6"
        >
          <h3 className="text-white font-semibold mb-5">My Students</h3>
          {recentStudents.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <div className="text-3xl mb-2">👥</div>
              <p>No students assigned yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentStudents.map(s => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {(s.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-300 text-sm font-medium truncate">{s.name}</p>
                    <p className="text-slate-500 text-xs truncate">{s.email} • {s.phone || '—'}</p>
                  </div>
                  <span className="badge badge-success">Active</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
