// src/pages/mentor/Attendance.jsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { markAttendance, checkAttendanceExists } from '../../firebase/firestore';

export default function MentorAttendance() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'users'), 
        where('mentorId', '==', user.uid), 
        where('role', '==', 'member')
      );
      const snap = await getDocs(q);
      
      const memberList = await Promise.all(snap.docs.map(async (uDoc) => {
        const userData = uDoc.data();
        // Check if attendance already marked for this date
        const attSnap = await checkAttendanceExists(uDoc.id, selectedDate);
        return {
          id: uDoc.id,
          name: userData.name,
          email: userData.email,
          status: attSnap.empty ? null : attSnap.docs[0].data().status,
          attendanceId: attSnap.empty ? null : attSnap.docs[0].id
        };
      }));
      
      setMembers(memberList);
    } catch (e) { 
      toast.error('Failed to load members'); 
      console.error(e);
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { if (user) loadMembers(); }, [user, selectedDate]);

  const handleMarkAttendance = async (memberId, status) => {
    setMarking(true);
    try {
      await markAttendance({
        memberId,
        mentorId: user.uid,
        date: selectedDate,
        status,
      });
      toast.success(`Marked as ${status}`);
      loadMembers();
    } catch (e) {
      toast.error('Failed to mark attendance');
    } finally {
      setMarking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-white text-2xl font-bold">Attendance Tracking</h1>
          <p className="text-slate-400 text-sm mt-1">Mark daily attendance for your members</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-slate-400 text-sm font-medium uppercase tracking-wider">Date:</label>
          <input 
            type="date" 
            className="form-input max-w-[180px]" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      <div className="glass-card p-6">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-800/50 rounded-xl animate-pulse" />)}
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-slate-400">No members assigned to you yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m, i) => (
                  <motion.tr key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {(m.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-white">{m.name}</span>
                      </div>
                    </td>
                    <td>
                      <div className="text-xs text-slate-500">{m.email}</div>
                    </td>
                    <td>
                      {m.status ? (
                        <span className={`badge ${m.status === 'present' ? 'badge-success' : 'badge-danger'}`}>
                          {m.status.toUpperCase()}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs italic">Not marked</span>
                      )
                    }
                    </td>
                    <td>
                      <div className="flex gap-2">
                        {!m.status ? (
                          <>
                            <button 
                              onClick={() => handleMarkAttendance(m.id, 'present')} 
                              disabled={marking}
                              className="btn-neon px-3 py-1.5 text-xs"
                            >
                              Present
                            </button>
                            <button 
                              onClick={() => handleMarkAttendance(m.id, 'absent')} 
                              disabled={marking}
                              className="btn-danger px-3 py-1.5 text-xs"
                            >
                              Absent
                            </button>
                          </>
                        ) : (
                          <span className="text-slate-500 text-xs">Completed</span>
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
