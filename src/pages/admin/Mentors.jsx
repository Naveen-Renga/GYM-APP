// src/pages/admin/Mentors.jsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import { getAllMentors, createMentor, deleteMentor, getAllMembers, promoteToMentor } from '../../firebase/firestore';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where, doc, setDoc } from 'firebase/firestore';

export default function AdminMentors() {
  const [mentors, setMentors] = useState([]);
  const [studentCounts, setStudentCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', specialization: '' });

  const loadMentors = async () => {
    setLoading(true);
    try {
      const [mSnap, memSnap] = await Promise.all([
        getAllMentors(),
        getDocs(collection(db, 'members'))
      ]);
      const counts = {};
      memSnap.docs.forEach(d => {
        const mid = d.data().mentorId;
        if (mid) counts[mid] = (counts[mid] || 0) + 1;
      });
      setStudentCounts(counts);
      setMentors(mSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { toast.error('Failed to load mentors'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadMentors(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.email) { toast.error('Email required'); return; }
    setSaving(true);
    try {
      await promoteToMentor(form.email, form.specialization, form.phone);
      toast.success('Mentor added/promoted successfully!');
      setShowModal(false);
      setForm({ name: '', email: '', phone: '', specialization: '' });
      loadMentors();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this mentor?')) return;
    try {
      await deleteMentor(id);
      toast.success('Mentor removed');
      loadMentors();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Mentors</h1>
          <p className="text-slate-400 text-sm mt-1">Manage your gym trainers</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-neon">
          + Add Mentor
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="glass-card p-6 animate-pulse">
              <div className="w-12 h-12 bg-slate-700 rounded-xl mb-4" />
              <div className="w-32 h-4 bg-slate-700 rounded mb-2" />
              <div className="w-20 h-3 bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      ) : mentors.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <div className="text-5xl mb-4">🏅</div>
          <p className="text-slate-300 font-medium">No mentors yet</p>
          <p className="text-slate-500 text-sm mt-1">Add your first mentor to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {mentors.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="glass-card p-5"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-gold to-amber-600 flex items-center justify-center text-dark-900 font-bold text-xl">
                    {(m.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{m.name}</p>
                    <span className="badge badge-gold text-xs">{m.specialization || 'General'}</span>
                  </div>
                </div>
                <button onClick={() => handleDelete(m.id)} className="btn-danger px-2.5 py-1 text-xs">✕</button>
              </div>
              <div className="space-y-1.5 text-sm text-slate-400 border-t border-white/[0.06] pt-4">
                <p>📧 {m.email}</p>
                <p>📱 {m.phone || '—'}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.06] flex justify-between items-center text-sm">
                <span className="text-slate-400">
                  <span className="text-white font-semibold">{studentCounts[m.id] || 0}</span> students
                </span>
                <div className="w-2 h-2 bg-neon-green rounded-full" />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Mentor Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add New Mentor">
        <form onSubmit={handleAdd} className="space-y-4">
          {[
            { label: 'Full Name', key: 'name', type: 'text', placeholder: 'John Doe' },
            { label: 'Email', key: 'email', type: 'email', placeholder: 'john@ironforge.com' },
            { label: 'Phone', key: 'phone', type: 'tel', placeholder: '+91 98765 43210' },
            { label: 'Specialization', key: 'specialization', type: 'text', placeholder: 'e.g. Strength Training' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">{label}</label>
              <input
                type={type}
                className="form-input"
                placeholder={placeholder}
                value={form[key]}
                onChange={e => setForm({ ...form, [key]: e.target.value })}
              />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-neon flex-1">
              {saving ? 'Adding...' : 'Add Mentor'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
