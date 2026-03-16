// src/pages/mentor/Messages.jsx
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getStudentsForMentor } from '../../firebase/firestore';
import ChatRoom from '../chat/ChatRoom';

export default function MentorMessages() {
  const { user, profile } = useAuth();
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const snap = await getStudentsForMentor(user.uid);
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setStudents(list);
        if (list.length > 0) setSelectedStudent(list[0]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
      {/* Student List Sidebar */}
      <div className="lg:col-span-1 space-y-4">
        <h2 className="text-white font-bold px-2">My Students</h2>
        <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
          {loading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="h-16 animate-pulse bg-white/[0.03] rounded-xl" />
            ))
          ) : students.length === 0 ? (
            <p className="text-slate-500 text-sm px-2">No students assigned yet.</p>
          ) : (
            students.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedStudent(s)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border ${
                  selectedStudent?.id === s.id 
                    ? 'bg-neon-blue/10 border-neon-blue/30' 
                    : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05]'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center text-white font-bold text-sm">
                  {(s.name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="text-left min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{s.name}</p>
                  <p className="text-slate-500 text-[10px] truncate">{s.email}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="lg:col-span-3">
        {selectedStudent ? (
          <ChatRoom currentUser={user} profile={profile} otherUser={selectedStudent} />
        ) : (
          <div className="glass-card h-full flex flex-col items-center justify-center text-slate-500">
            <div className="text-5xl mb-4 opacity-10">📪</div>
            <p>Select a student to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
