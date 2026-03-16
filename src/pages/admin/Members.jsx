// src/pages/admin/Members.jsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import {
  getAllMembers, getAllMentors, getAllPlans, createMember, deleteMember,
  assignMentorToMember, assignPlanToMember, promoteToMentor
} from '../../firebase/firestore';
import { db } from '../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';

export default function AdminMembers() {
  const [members, setMembers] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', planId: '', mentorId: '' });
  // Assign Plan state
  const [assignTarget, setAssignTarget] = useState(null); // { id, name }
  const [assignPlanId, setAssignPlanId] = useState('');
  const [assigning, setAssigning] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [uSnap, mentSnap, plSnap, memInfoSnap] = await Promise.all([
        getAllMembers(), getAllMentors(), getAllPlans(),
        getDocs(collection(db, 'members'))
      ]);

      setMentors(mentSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setPlans(plSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const infoMap = {};
      memInfoSnap.docs.forEach(d => (infoMap[d.id] = d.data()));

      const planMap = {};
      plSnap.docs.forEach(d => (planMap[d.id] = d.data().name));

      const mentMap = {};
      mentSnap.docs.forEach(d => (mentMap[d.id] = d.data().name));

      setMembers(uSnap.docs.map(d => {
        const u = d.data(); const i = infoMap[d.id] || {};
        return {
          id: d.id, name: u.name, email: u.email, phone: u.phone,
          plan: planMap[i.planId] || '—', mentor: mentMap[i.mentorId] || 'Unassigned',
          status: i.status || 'inactive', mentorId: i.mentorId,
          originalMentorId: i.mentorId // To track changes
        };
      }));
    } catch (e) { toast.error('Failed to load members'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) { toast.error('Name and email required'); return; }
    setSaving(true);
    try {
      const uid = `member_${Date.now()}`;
      const selectedPlan = plans.find(p => p.id === form.planId);

      const expiryDate = selectedPlan
        ? new Date(Date.now() + (selectedPlan.durationDays || 30) * 86400000)
        : null;

      await createMember(
        uid,
        { name: form.name, email: form.email, phone: form.phone },
        {
          planId: form.planId || null,
          mentorId: form.mentorId || null,
          status: form.planId ? 'active' : 'inactive',
          expiryDate: expiryDate ? expiryDate : null,
        }
      );
      toast.success('Member created!');
      setShowModal(false);
      setForm({ name: '', email: '', phone: '', planId: '', mentorId: '' });
      loadData();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this member?')) return;
    try {
      await deleteMember(id);
      toast.success('Member removed');
      loadData();
    } catch (e) { toast.error(e.message); }
  };

  const filtered = members.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase()) ||
    m.phone?.includes(search)
  );

  const handleUpdateMentor = async (memberId, mentorId) => {
    try {
      await assignMentorToMember(memberId, mentorId);
      toast.success('Mentor assigned successfully!');
      loadData();
    } catch (e) {
      toast.error('Failed to assign mentor: ' + e.message);
    }
  };

  const handleAssignPlan = async () => {
    if (!assignPlanId) { toast.error('Select a plan'); return; }
    const plan = plans.find(p => p.id === assignPlanId);
    if (!plan) { toast.error('Plan not found'); return; }
    setAssigning(true);
    try {
      await assignPlanToMember(assignTarget.id, assignPlanId, plan.durationDays);
      toast.success(`Plan "${plan.name}" assigned to ${assignTarget.name}!`);
      setAssignTarget(null);
      setAssignPlanId('');
      loadData();
    } catch (e) { toast.error(e.message); }
    finally { setAssigning(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Members</h1>
          <p className="text-slate-400 text-sm mt-1">Manage gym members</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-neon">+ Add Member</button>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <input
            type="text"
            className="form-input max-w-xs"
            placeholder="🔍  Search members..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <span className="text-slate-500 text-sm">{filtered.length} members</span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="flex items-center gap-4 p-4 animate-pulse border-b border-white/[0.04]">
                <div className="w-10 h-10 bg-slate-700 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="w-32 h-3 bg-slate-700 rounded" />
                  <div className="w-48 h-2 bg-slate-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <div className="text-4xl mb-3">👥</div>
            <p>{search ? 'No results found' : 'No members yet'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Contact</th>
                  <th>Plan</th>
                  <th>Mentor</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => (
                  <motion.tr
                    key={m.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
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
                    <td><span className="badge badge-blue">{m.plan}</span></td>
                    <td>
                      <select 
                        className="bg-dark-600 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-neon-green"
                        value={m.mentorId || ''}
                        onChange={(e) => {
                          const newId = e.target.value;
                          setMembers(prev => prev.map(item => 
                            item.id === m.id ? { ...item, mentorId: newId } : item
                          ));
                        }}
                      >
                        <option value="">Unassigned</option>
                        {mentors.map(mt => (
                          <option key={mt.id} value={mt.id}>{mt.name}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span className={`badge ${m.status === 'active' ? 'badge-success' : 'badge-gray'}`}>
                        {m.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        {m.mentorId !== m.originalMentorId && (
                          <button 
                            onClick={() => handleUpdateMentor(m.id, m.mentorId)}
                            className="btn-neon text-[10px] py-1 px-3"
                          >
                            Save
                          </button>
                        )}
                        <button
                          onClick={() => { setAssignTarget({ id: m.id, name: m.name }); setAssignPlanId(m.planId || ''); }}
                          className="btn-ghost text-xs py-1 px-2"
                        >
                          📋 Plan
                        </button>
                        <button 
                          onClick={async () => {
                            if (!confirm(`Promote ${m.name} to Mentor?`)) return;
                            try {
                              await promoteToMentor(m.email, m.name);
                              toast.success(`${m.name} promoted to Mentor!`);
                              loadData();
                            } catch (e) { toast.error(e.message); }
                          }} 
                          className="btn-ghost text-xs py-1"
                        >
                          Promote
                        </button>
                        <button onClick={() => handleDelete(m.id)} className="btn-danger">Remove</button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add New Member" size="md">
        <form onSubmit={handleAdd} className="space-y-4">
          {[
            { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Jane Smith' },
            { label: 'Email', key: 'email', type: 'email', placeholder: 'jane@example.com' },
            { label: 'Phone', key: 'phone', type: 'tel', placeholder: '+91 98765 43210' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">{label}</label>
              <input type={type} className="form-input" placeholder={placeholder}
                value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} />
            </div>
          ))}

          <div>
            <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">Membership Plan</label>
            <select className="form-input" value={form.planId} onChange={e => setForm({ ...form, planId: e.target.value })}>
              <option value="">— Select Plan —</option>
              {plans.map(p => <option key={p.id} value={p.id}>₹{p.price} – {p.name} ({p.durationDays} days)</option>)}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">Assign Mentor</label>
            <select className="form-input" value={form.mentorId} onChange={e => setForm({ ...form, mentorId: e.target.value })}>
              <option value="">— Select Mentor —</option>
              {mentors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-neon flex-1">{saving ? 'Creating...' : 'Create Member'}</button>
          </div>
        </form>
      </Modal>

      {/* Assign Plan Modal */}
      <Modal open={!!assignTarget} onClose={() => { setAssignTarget(null); setAssignPlanId(''); }} title={`Assign Plan to ${assignTarget?.name}`}>
        <div className="space-y-4">
          <div>
            <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">Select Membership Plan</label>
            <select className="form-input" value={assignPlanId} onChange={e => setAssignPlanId(e.target.value)}>
              <option value="">— Select Plan —</option>
              {plans.map(p => (
                <option key={p.id} value={p.id}>₹{p.price} – {p.name} ({p.durationDays} days)</option>
              ))}
            </select>
          </div>
          {assignPlanId && (() => {
            const plan = plans.find(p => p.id === assignPlanId);
            if (!plan) return null;
            const start = new Date();
            const end = new Date(start.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
            return (
              <div className="p-3 rounded-lg bg-neon-green/5 border border-neon-green/20 text-xs text-slate-300 space-y-1">
                <div>📅 <span className="text-slate-400">Start:</span> {start.toLocaleDateString('en-IN')}</div>
                <div>🏁 <span className="text-slate-400">End:</span> {end.toLocaleDateString('en-IN')}</div>
                <div>⏳ <span className="text-slate-400">Duration:</span> {plan.durationDays} days</div>
              </div>
            );
          })()}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setAssignTarget(null); setAssignPlanId(''); }} className="btn-ghost flex-1">Cancel</button>
            <button onClick={handleAssignPlan} disabled={assigning} className="btn-neon flex-1">
              {assigning ? 'Assigning...' : 'Assign Plan'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
