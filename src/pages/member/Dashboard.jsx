// src/pages/member/Dashboard.jsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import StatCard from '../../components/ui/StatCard';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { getDoc, doc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { getMemberAttendance } from '../../firebase/firestore';

export default function MemberDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [memberData, setMemberData] = useState(null);  // from 'users' collection
  const [nextSession, setNextSession] = useState(null);
  const [totalSessions, setTotalSessions] = useState(0);
  const [notes, setNotes] = useState(null);
  const [mentor, setMentor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('Inactive');
  const [daysLeft, setDaysLeft] = useState(null);
  const [planName, setPlanName] = useState('No Plan');
  const [attendance, setAttendance] = useState([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        // 1. Get member data from 'users' collection (has membershipEnd, membershipStart)
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
        setMemberData(userData);

        // 2. Compute Status and Days Remaining from membershipEnd
        if (userData.membershipEnd) {
          // Handle both Firestore Timestamp and string date
          const membershipEnd = userData.membershipEnd?.toDate
            ? userData.membershipEnd.toDate()
            : new Date(userData.membershipEnd);

          const today = new Date();
          today.setHours(0, 0, 0, 0);
          membershipEnd.setHours(0, 0, 0, 0);

          const diffMs = membershipEnd.getTime() - today.getTime();
          const diffDays = Math.ceil(diffMs / (1000 * 3600 * 24));

          setDaysLeft(Math.max(0, diffDays));           // 0 if expired
          setStatus(membershipEnd >= today ? 'Active' : 'Inactive');
        } else {
          // No membership data — default to Inactive, 0 days
          setDaysLeft(0);
          setStatus('Inactive');
        }

        // 2.5 Load Plan Name
        if (userData.planId) {
          const planDoc = await getDoc(doc(db, 'plans', userData.planId));
          if (planDoc.exists()) setPlanName(planDoc.data().name);
        }

        // 3. Load mentor info
        const mentId = profile?.mentorId || userData.mentorId;
        if (mentId) {
          const mentDoc = await getDoc(doc(db, 'users', mentId));
          if (mentDoc.exists()) setMentor(mentDoc.data());
        }

        // 4. Fetch member notes
        const nDoc = await getDoc(doc(db, 'memberNotes', user.uid));
        if (nDoc.exists()) setNotes(nDoc.data());

        // 5. Total Sessions = count of accepted bookings
        const acceptedSnap = await getDocs(query(
          collection(db, 'bookings'),
          where('memberId', '==', user.uid),
          where('status', '==', 'accepted')
        ));
        setTotalSessions(acceptedSnap.size);

        // 6. Next Session = nearest upcoming accepted booking (date >= today)
        const todayStr = new Date().toISOString().split('T')[0];
        const upcomingSnap = await getDocs(query(
          collection(db, 'bookings'),
          where('memberId', '==', user.uid),
          where('status', '==', 'accepted')
        ));
        const upcoming = upcomingSnap.docs
          .map(d => d.data())
          .filter(b => b.date >= todayStr)
          .sort((a, b) => a.date.localeCompare(b.date));
        setNextSession(upcoming[0] || null);

        // 7. Fetch Attendance History
        const attSnap = await getMemberAttendance(user.uid);
        const sortedAtt = attSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => b.date.localeCompare(a.date));
        setAttendance(sortedAtt.slice(0, 5));

      } catch (e) {
        console.error('Failed to load member dashboard:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, profile]);

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const isActive = status === 'Active';

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 bg-gradient-to-r from-neon-blue/10 to-neon-purple/5 border-neon-blue/20"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white text-xl font-bold">Welcome back, {profile?.name} 💪</h2>
            <p className="text-slate-400 text-sm mt-1">{today}</p>
          </div>
          <div className="text-4xl text-neon-blue">⚡</div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Current Plan"
          value={loading ? '...' : planName}
          icon="💎"
          accent="blue"
          index={0}
        />
        <StatCard
          label="Status"
          value={loading ? '...' : status}
          icon={isActive ? "✅" : "⚠️"}
          accent={isActive ? "green" : "red"}
          index={1}
        />
        <StatCard
          label="Days Remaining"
          value={loading ? '...' : `${daysLeft ?? 0} days`}
          icon="⏱️"
          accent={(daysLeft ?? 0) === 0 ? 'red' : (daysLeft ?? 0) <= 7 ? 'red' : (daysLeft ?? 0) <= 30 ? 'gold' : 'blue'}
          index={2}
        />
        <StatCard
          label="Next Session"
          value={loading ? '...' : (nextSession ? nextSession.date : 'None')}
          icon="📅"
          accent="gold"
          index={3}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Next Session Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-white font-semibold">Upcoming Session</h3>
            <button onClick={() => navigate('/member/book-session')} className="text-neon-green text-xs hover:underline">Book New</button>
          </div>
          {nextSession ? (
            <div className="p-4 rounded-xl bg-gradient-to-br from-white/[0.05] to-transparent border border-white/[0.05]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-neon-green font-mono font-bold">{nextSession.date} • {nextSession.time || 'TBD'}</span>
                <span className={`badge ${nextSession.status === 'accepted' ? 'badge-success' : 'badge-warning'}`}>{nextSession.status}</span>
              </div>
              <p className="text-slate-300">{nextSession.sessionType || 'General Training'}</p>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 bg-white/[0.02] rounded-xl border border-white/[0.02]">
              <p>No upcoming sessions.</p>
              <button onClick={() => navigate('/member/book-session')} className="btn-neon mt-4 py-2 px-4 text-sm">Schedule Now</button>
            </div>
          )}
        </motion.div>

        {/* Quick Plan Overview */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-white font-semibold">Today's Focus</h3>
            <button onClick={() => navigate('/member/workout-plan')} className="text-neon-blue text-xs hover:underline">View Full Plan</button>
          </div>
          {notes?.workout || notes?.diet ? (
            <div className="space-y-4">
              {notes.workout && (
                <div>
                  <h4 className="text-slate-400 text-xs uppercase tracking-wider mb-2">Workout</h4>
                  <div className="text-slate-300 text-sm p-3 rounded-lg bg-white/[0.03] border border-white/[0.03] line-clamp-3">
                    {notes.workout}
                  </div>
                </div>
              )}
              {notes.diet && (
                <div>
                  <h4 className="text-slate-400 text-xs uppercase tracking-wider mb-2">Diet</h4>
                  <div className="text-slate-300 text-sm p-3 rounded-lg bg-white/[0.03] border border-white/[0.03] line-clamp-2">
                    {notes.diet}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 bg-white/[0.02] rounded-xl border border-white/[0.02]">
              <p>No plan assigned yet.</p>
            </div>
          )}
        </motion.div>

        {/* My Mentor Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-white font-semibold">My Mentor</h3>
            <button onClick={() => navigate('/member/my-mentor')} className="text-neon-blue text-xs hover:underline">Details</button>
          </div>
          {mentor ? (
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                {(mentor.name || '?').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-bold truncate">{mentor.name}</h4>
                <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                  <div className="truncate">📧 {mentor.email}</div>
                  <div>📱 {mentor.phone || '—'}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 bg-white/[0.02] rounded-xl border border-white/[0.02]">
              <p className="text-sm">No mentor assigned yet.</p>
            </div>
          )}
        </motion.div>

        {/* Attendance History Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-white font-semibold">Recent Attendance</h3>
            <button onClick={() => navigate('/member/attendance')} className="text-neon-green text-xs hover:underline">View All</button>
          </div>
          {attendance.length > 0 ? (
            <div className="space-y-3">
              {attendance.map((rec) => (
                <div key={rec.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-sm">
                      {new Date(rec.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </span>
                    <span className="text-slate-600">—</span>
                    <span className={`text-sm font-medium ${rec.status === 'present' ? 'text-neon-green' : 'text-red-400'}`}>
                      {rec.status.toUpperCase()}
                    </span>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${rec.status === 'present' ? 'bg-neon-green shadow-glow-green' : 'bg-red-500'}`} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 bg-white/[0.02] rounded-xl border border-white/[0.02]">
              <p className="text-sm">No attendance records found.</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
