// src/pages/member/Messages.jsx
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getUser } from '../../firebase/firestore';
import ChatRoom from '../chat/ChatRoom';

export default function MemberMessages() {
  const { user, profile } = useAuth();
  const [mentor, setMentor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const mentId = profile?.mentorId;
        if (!mentId) {
          setLoading(false);
          return;
        }
        const snap = await getUser(mentId);
        if (snap.exists()) {
          setMentor({ id: snap.id, ...snap.data() });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, profile]);

  if (loading) return <div className="h-64 animate-pulse bg-white/[0.03] rounded-2xl" />;

  if (!mentor) {
    return (
      <div className="glass-card p-16 text-center">
        <div className="text-5xl mb-4 opacity-20">🏅</div>
        <h3 className="text-white font-medium mb-2">No Mentor Assigned</h3>
        <p className="text-slate-400 text-sm max-w-sm mx-auto">
          Contact the admin to get a personal trainer assigned. Once assigned, you can chat with them here!
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <ChatRoom currentUser={user} profile={profile} otherUser={mentor} />
    </div>
  );
}
