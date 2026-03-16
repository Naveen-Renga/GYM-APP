// src/pages/mentor/WorkoutPlans.jsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { createWorkoutPlan, getMentorWorkoutPlans, deleteWorkoutPlan } from '../../firebase/firestore';
import { db } from '../../firebase/config';
import { getDocs, collection, query, where } from 'firebase/firestore';

const EXERCISE_TEMPLATES = [
  'Chest Day', 'Back Day', 'Leg Day', 'Shoulder Day', 'Arm Day', 'Full Body', 'Cardio Day', 'Rest & Recovery'
];

export default function MentorWorkouts() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ memberId: '', title: '', exercises: [{ day: '', sets: '', reps: '', notes: '' }] });

  const load = async () => {
    setLoading(true);
    try {
      const [planSnap, memSnap] = await Promise.all([
        getMentorWorkoutPlans(user.uid),
        getDocs(query(collection(db, 'members'), where('mentorId', '==', user.uid)))
      ]);

      // Resolve user names
      const memIds = memSnap.docs.map(d => d.id);
      const nameMap = {};
      if (memIds.length > 0) {
        const uSnap = await getDocs(query(collection(db, 'users'), where('__name__', 'in', memIds)));
        uSnap.docs.forEach(d => (nameMap[d.id] = d.data().name));
      }
      setMembers(memSnap.docs.map(d => ({ id: d.id, name: nameMap[d.id] || d.id })));
      setPlans(planSnap.docs.map(d => ({ id: d.id, ...d.data(), memberName: nameMap[d.data().memberId] || '—' })));
    } catch (e) { toast.error('Failed to load plans'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (user) load(); }, [user]);

  const addExercise = () => setForm({ ...form, exercises: [...form.exercises, { day: '', sets: '', reps: '', notes: '' }] });
  const removeExercise = (i) => setForm({ ...form, exercises: form.exercises.filter((_, idx) => idx !== i) });
  const updateExercise = (i, key, value) => {
    const exs = [...form.exercises];
    exs[i] = { ...exs[i], [key]: value };
    setForm({ ...form, exercises: exs });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.memberId || !form.title) { toast.error('Select a member and plan title'); return; }
    setSaving(true);
    try {
      await createWorkoutPlan({ mentorId: user.uid, memberId: form.memberId, title: form.title, exercises: form.exercises });
      toast.success('Workout plan created!');
      setShowModal(false);
      setForm({ memberId: '', title: '', exercises: [{ day: '', sets: '', reps: '', notes: '' }] });
      load();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this workout plan?')) return;
    try { await deleteWorkoutPlan(id); toast.success('Plan deleted'); load(); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Workout Plans</h1>
          <p className="text-slate-400 text-sm mt-1">Create and assign workout programs</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-neon">+ Create Plan</button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2].map(i => <div key={i} className="glass-card h-48 animate-pulse" />)}
        </div>
      ) : plans.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <div className="text-5xl mb-4">🏋️</div>
          <p className="text-slate-300 font-medium">No workout plans yet</p>
          <p className="text-slate-500 text-sm mt-1">Create a plan for your members</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-5"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-white font-semibold">{p.title}</h3>
                  <p className="text-slate-400 text-xs mt-0.5">For: <span className="text-neon-green">{p.memberName}</span></p>
                </div>
                <button onClick={() => handleDelete(p.id)} className="btn-danger px-2 py-1 text-xs">✕</button>
              </div>
              <div className="space-y-2">
                {(p.exercises || []).slice(0, 4).map((ex, j) => (
                  <div key={j} className="flex items-center gap-3 text-sm p-2 rounded-lg bg-white/[0.03]">
                    <span className="w-6 h-6 rounded-full bg-neon-green/20 text-neon-green text-xs flex items-center justify-center font-bold flex-shrink-0">{j + 1}</span>
                    <span className="text-slate-300 flex-1">{ex.day || 'Exercise'}</span>
                    {ex.sets && <span className="text-slate-500 text-xs">{ex.sets} sets × {ex.reps} reps</span>}
                  </div>
                ))}
                {(p.exercises || []).length > 4 && (
                  <p className="text-slate-500 text-xs px-2">+{p.exercises.length - 4} more exercises</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Workout Plan Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create Workout Plan" size="lg">
        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">Assign To Member</label>
            <select className="form-input" value={form.memberId} onChange={e => setForm({ ...form, memberId: e.target.value })}>
              <option value="">— Select Member —</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">Plan Title</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {EXERCISE_TEMPLATES.map(t => (
                <button key={t} type="button" onClick={() => setForm({ ...form, title: t })}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-all ${form.title === t ? 'border-neon-green text-neon-green bg-neon-green/10' : 'border-white/10 text-slate-400 hover:border-white/20'}`}>
                  {t}
                </button>
              ))}
            </div>
            <input type="text" className="form-input" placeholder="Custom plan name..."
              value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Exercises</label>
              <button type="button" onClick={addExercise} className="text-neon-green text-xs hover:text-neon-green/70">+ Add Row</button>
            </div>
            <div className="space-y-2">
              {form.exercises.map((ex, i) => (
                <div key={i} className="flex gap-2">
                  <input className="form-input flex-1 text-xs" placeholder="Exercise / Day" value={ex.day}
                    onChange={e => updateExercise(i, 'day', e.target.value)} />
                  <input className="form-input w-16 text-xs" placeholder="Sets" type="number" value={ex.sets}
                    onChange={e => updateExercise(i, 'sets', e.target.value)} />
                  <input className="form-input w-16 text-xs" placeholder="Reps" type="number" value={ex.reps}
                    onChange={e => updateExercise(i, 'reps', e.target.value)} />
                  {form.exercises.length > 1 && (
                    <button type="button" onClick={() => removeExercise(i)} className="text-red-400 hover:text-red-300 px-2 flex-shrink-0">✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-neon flex-1">{saving ? 'Creating...' : 'Create Plan'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
