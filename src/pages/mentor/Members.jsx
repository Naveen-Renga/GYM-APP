// src/pages/mentor/Members.jsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { getMemberNotes, saveMemberNotes, getMemberFeedback, markFeedbackAsSeen } from '../../firebase/firestore';
import { db } from '../../firebase/config';
import { getDocs, collection, query, where, doc, getDoc } from 'firebase/firestore';

export default function MentorMembers() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState({ workout: '', diet: '', progress: '' });
  const [memberFeedback, setMemberFeedback] = useState(null);
  const [saving, setSaving] = useState(false);

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
        // Still need status from 'members' doc if it exists there
        const mSnap = await getDoc(doc(db, 'members', uDoc.id));
        return {
          id: uDoc.id,
          ...userData,
          status: mSnap.exists() ? mSnap.data().status : 'inactive'
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

  useEffect(() => { if (user) loadMembers(); }, [user]);

  const openManage = async (member) => {
    setSelected(member);
    setNotes({ workout: 'Loading...', diet: 'Loading...', progress: 'Loading...' });
    try {
      const [nSnap, fDoc] = await Promise.all([
        getMemberNotes(member.id),
        getMemberFeedback(member.id)
      ]);

      if (nSnap.exists()) {
        const d = nSnap.data();
        setNotes({ workout: d.workout || '', diet: d.diet || '', progress: d.progress || '' });
      } else {
        setNotes({ workout: '', diet: '', progress: '' });
      }

      if (fDoc.exists()) {
        setMemberFeedback(fDoc.data());
      } else {
        setMemberFeedback(null);
      }
    } catch { 
      setNotes({ workout: '', diet: '', progress: '' }); 
      setMemberFeedback(null);
    }
  };

  const handleMarkAsSeen = async () => {
    try {
      await markFeedbackAsSeen(selected.id);
      setMemberFeedback({ ...memberFeedback, mentorSeen: true });
      toast.success('Feedback marked as seen');
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveMemberNotes(selected.id, notes);
      toast.success('Plan saved!');
      setSelected(null);
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const filtered = members.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white text-2xl font-bold">My Members</h1>
        <p className="text-slate-400 text-sm mt-1">View and manage assigned members' plans</p>
      </div>

      <div className="glass-card p-6">
        <div className="mb-5">
          <input type="text" className="form-input max-w-xs" placeholder="🔍  Search members..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-800/50 rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">👥</div>
            <p className="text-slate-400">{search ? 'No results found' : 'No members assigned to you yet'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Member</th><th>Contact</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map((m, i) => (
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
                      <div className="text-xs">
                        <div>{m.phone || '—'}</div>
                        <div className="text-slate-500">{m.email}</div>
                      </div>
                    </td>
                    <td><span className={`badge ${m.status === 'active' ? 'badge-success' : 'badge-gray'}`}>{m.status}</span></td>
                    <td>
                      <button onClick={() => openManage(m)} className="btn-neon px-3 py-1.5 text-xs">Manage Plan</button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manage Plan Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Manage: ${selected?.name}`} size="md">
        <div className="space-y-4">
          {[
            { label: 'Workout Plan', key: 'workout', placeholder: 'e.g. Mon: Chest + Triceps\nTue: Back + Biceps...' },
            { label: 'Diet Plan', key: 'diet', placeholder: 'e.g. Pre-workout: 2 bananas, oats...' },
            { label: 'Progress Notes', key: 'progress', placeholder: 'e.g. Week 1 - Strength improving...' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">{label}</label>
              <textarea className="form-input min-h-[90px] resize-y text-sm" placeholder={placeholder}
                value={notes[key]} onChange={e => setNotes({ ...notes, [key]: e.target.value })} />
            </div>
          ))}

          {/* Member's Feedback for Mentor to see */}
          {memberFeedback && (
            <div className="p-4 rounded-xl bg-neon-blue/5 border border-neon-blue/10 mt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-neon-blue text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                  <span>💬</span> Member's Feedback
                </h4>
                {memberFeedback.mentorSeen ? (
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Seen ✅</span>
                ) : (
                  <button 
                    onClick={handleMarkAsSeen}
                    className="text-[10px] text-neon-green hover:underline uppercase font-bold"
                  >
                    Mark as Seen
                  </button>
                )}
              </div>
              <p className="text-slate-300 text-sm italic whitespace-pre-wrap leading-relaxed">
                "{memberFeedback.text}"
              </p>
              <div className="text-[10px] text-slate-500 mt-2">
                Last updated: {memberFeedback.updatedAt?.toDate().toLocaleDateString()}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={() => setSelected(null)} className="btn-ghost flex-1">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-neon flex-1">
              {saving ? 'Saving...' : 'Save Plan'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
