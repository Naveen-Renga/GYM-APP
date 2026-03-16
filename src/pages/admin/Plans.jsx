// src/pages/admin/Plans.jsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import { getAllPlans, createPlan, updatePlan, deletePlan } from '../../firebase/firestore';

const EMPTY_FORM = { name: '', price: '', durationDays: '', features: '', description: '', isPopular: false };

export default function AdminPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null); // null = create mode, object = edit mode
  const [form, setForm] = useState(EMPTY_FORM);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const snap = await getAllPlans();
      setPlans(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { toast.error('Failed to load plans'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadPlans(); }, []);

  const openCreate = () => {
    setEditingPlan(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (plan) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name || '',
      price: plan.price?.toString() || '',
      durationDays: plan.durationDays?.toString() || '',
      features: plan.features || '',
      description: plan.description || '',
      isPopular: plan.isPopular || false,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.durationDays) {
      toast.error('Name, price and duration required');
      return;
    }
    setSaving(true);
    try {
      const data = {
        name: form.name,
        price: Number(form.price),
        durationDays: Number(form.durationDays),
        features: form.features,
        description: form.description,
        isPopular: form.isPopular,
      };
      if (editingPlan) {
        await updatePlan(editingPlan.id, data);
        toast.success('Plan updated!');
      } else {
        await createPlan(data);
        toast.success('Plan created!');
      }
      setShowModal(false);
      setForm(EMPTY_FORM);
      setEditingPlan(null);
      loadPlans();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this plan?')) return;
    try { await deletePlan(id); toast.success('Plan deleted'); loadPlans(); }
    catch (e) { toast.error(e.message); }
  };

  const accentColors = ['from-neon-green to-neon-blue', 'from-neon-purple to-neon-pink', 'from-amber-500 to-orange-500'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Membership Plans</h1>
          <p className="text-slate-400 text-sm mt-1">Configure pricing &amp; features</p>
        </div>
        <button onClick={openCreate} className="btn-neon">+ Create Plan</button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="glass-card h-64 animate-pulse" />)}
        </div>
      ) : plans.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <div className="text-5xl mb-4">💎</div>
          <p className="text-slate-300 font-medium">No plans yet</p>
          <p className="text-slate-500 text-sm mt-1">Create membership plans for your gym</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {plans.map((p, i) => {
            const features = (p.features || '').split('\n').filter(Boolean);
            const gradient = accentColors[i % accentColors.length];
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`glass-card p-6 relative overflow-hidden ${p.isPopular ? 'border border-neon-green/30' : ''}`}
              >
                {p.isPopular && (
                  <div className="absolute top-4 right-4">
                    <span className="badge badge-success text-xs">⭐ Popular</span>
                  </div>
                )}
                <div className={`text-transparent bg-clip-text bg-gradient-to-r ${gradient} text-xs font-bold uppercase tracking-widest mb-3`}>
                  {p.name}
                </div>
                <div className="mb-3">
                  <span className="text-slate-400 text-sm">₹</span>
                  <span className="text-white text-4xl font-black">{p.price?.toLocaleString('en-IN')}</span>
                  <span className="text-slate-500 text-sm ml-1">/{p.durationDays} days</span>
                </div>
                {p.description && (
                  <p className="text-slate-400 text-xs mb-3">{p.description}</p>
                )}
                {features.length > 0 && (
                  <ul className="space-y-2 mb-6">
                    {features.map((f, fi) => (
                      <li key={fi} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="text-neon-green mt-0.5 flex-shrink-0">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex gap-2 mt-auto">
                  <button onClick={() => openEdit(p)} className="btn-ghost flex-1 justify-center text-sm py-1.5">
                    ✏️ Edit
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="btn-danger flex-1 justify-center">
                    Delete
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Plan Modal */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingPlan(null); setForm(EMPTY_FORM); }}
        title={editingPlan ? `Edit Plan: ${editingPlan.name}` : 'Create Membership Plan'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: 'Plan Name', key: 'name', type: 'text', placeholder: 'Gold Membership' },
            { label: 'Price (₹)', key: 'price', type: 'number', placeholder: '2999' },
            { label: 'Duration (Days)', key: 'durationDays', type: 'number', placeholder: '30' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">{label}</label>
              <input type={type} className="form-input" placeholder={placeholder}
                value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} />
            </div>
          ))}
          <div>
            <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">Description</label>
            <input type="text" className="form-input" placeholder="Short description..."
              value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">Features (one per line)</label>
            <textarea className="form-input min-h-[100px] resize-y" placeholder={"Unlimited gym access\nPersonal trainer\nDiet consultation"}
              value={form.features} onChange={e => setForm({ ...form, features: e.target.value })} />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="popular" checked={form.isPopular}
              onChange={e => setForm({ ...form, isPopular: e.target.checked })}
              className="w-4 h-4 accent-neon-green" />
            <label htmlFor="popular" className="text-slate-300 text-sm">Mark as Popular</label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setShowModal(false); setEditingPlan(null); setForm(EMPTY_FORM); }} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-neon flex-1">
              {saving ? (editingPlan ? 'Saving...' : 'Creating...') : (editingPlan ? 'Save Changes' : 'Create Plan')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
