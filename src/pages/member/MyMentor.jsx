// src/pages/member/MyMentor.jsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { getDoc, doc, collection, query, where, getDocs } from 'firebase/firestore';

export default function MemberMyMentor() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [mentor, setMentor] = useState(null);
  const [notes, setNotes] = useState(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        let mentId = profile?.mentorId;
        
        if (!mentId) {
          const mDoc = await getDoc(doc(db, 'members', user.uid));
          if (mDoc.exists()) mentId = mDoc.data().mentorId;
        }
        
        if (!mentId) {
          setLoading(false);
          return;
        }

        const [mentorDoc, nDoc, bSnap] = await Promise.all([
          getDoc(doc(db, 'users', mentId)),
          getDoc(doc(db, 'memberNotes', user.uid)),
          getDocs(query(collection(db, 'bookings'), where('memberId', '==', user.uid), where('mentorId', '==', mentId)))
        ]);

        if (mentorDoc.exists()) setMentor(mentorDoc.data());
        if (nDoc.exists()) setNotes(nDoc.data());
        setSessionCount(bSnap.size);
        
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white text-2xl font-bold">My Mentor</h1>
        <p className="text-slate-400 text-sm mt-1">Your personal trainer details</p>
      </div>

      {loading ? (
        <div className="h-48 animate-pulse bg-slate-800/50 rounded-xl" />
      ) : !mentor ? (
        <div className="glass-card p-16 text-center">
          <div className="text-5xl mb-4">🏋️</div>
          <h3 className="text-white font-medium mb-2">No Mentor Assigned</h3>
          <p className="text-slate-400 text-sm max-w-sm mx-auto">
            Contact the admin to get a personal trainer assigned to you. They will provide custom workout and diet plans.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 border-neon-blue/20">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-neon-blue to-purple-500 flex items-center justify-center text-4xl font-bold text-white shadow-xl shadow-neon-blue/20">
                {(mentor.name || '?').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-2xl font-bold text-white mb-1">{mentor.name}</h2>
                <span className="badge badge-gold mb-4 inline-block">{mentor.specialization || 'Personal Trainer'}</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-300">
                    <span className="text-neon-blue">📧</span> {mentor.email}
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-300">
                    <span className="text-neon-blue">📱</span> {mentor.phone || '—'}
                  </div>
                </div>
              </div>
              
              <div className="glass-card p-4 text-center border-neon-green/20 min-w-[120px]">
                <p className="text-3xl font-bold text-neon-green mb-1">{sessionCount}</p>
                <p className="text-slate-400 text-xs">Sessions Together</p>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-white/[0.05] flex gap-4">
              <button onClick={() => navigate('/member/book-session')} className="btn-neon flex-1 text-center justify-center">
                Book Session
              </button>
              <button onClick={() => navigate('/member/workout-plan')} className="btn-outline flex-1 text-center justify-center border-neon-blue text-neon-blue hover:bg-neon-blue/10">
                View My Plan
              </button>
            </div>
          </motion.div>

          {notes && (notes.workout || notes.diet || notes.progress) && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
              <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
                <span>📝</span> Notes from your Mentor
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {notes.workout && (
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <h4 className="text-neon-blue text-xs uppercase tracking-wider font-bold mb-3">Workout Plan</h4>
                    <p className="text-slate-300 text-sm whitespace-pre-wrap">{notes.workout}</p>
                  </div>
                )}
                {notes.diet && (
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <h4 className="text-neon-green text-xs uppercase tracking-wider font-bold mb-3">Diet Plan</h4>
                    <p className="text-slate-300 text-sm whitespace-pre-wrap">{notes.diet}</p>
                  </div>
                )}
                {notes.progress && (
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <h4 className="text-purple-400 text-xs uppercase tracking-wider font-bold mb-3">Progress</h4>
                    <p className="text-slate-300 text-sm whitespace-pre-wrap">{notes.progress}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
