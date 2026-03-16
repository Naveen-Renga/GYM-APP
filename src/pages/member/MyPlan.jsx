// src/pages/member/MyPlan.jsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { getDoc, doc, collection, getDocs } from 'firebase/firestore';

export default function MemberMyPlan() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [mDoc, pSnap] = await Promise.all([
          getDoc(doc(db, 'members', user.uid)),
          getDocs(collection(db, 'plans'))
        ]);
        const mData = mDoc.exists() ? mDoc.data() : {};
        setMember(mData);
        
        const plans = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAvailablePlans(plans);
        
        if (mData.planId) {
          setCurrentPlan(plans.find(p => p.id === mData.planId) || null);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [user]);

  const formatDate = (ts) => {
    if (!ts) return '—';
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const daysRemaining = (ts) => {
    if (!ts) return null;
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    const diff = d.getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
  };

  const dLeft = daysRemaining(member?.expiryDate);
  const isExpiringSoon = dLeft !== null && dLeft <= 7;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white text-2xl font-bold">My Membership</h1>
        <p className="text-slate-400 text-sm mt-1">Manage your active subscription</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Current Plan */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 border-neon-blue/20">
          <h3 className="text-white font-semibold mb-5">Active Plan</h3>
          {loading ? (
            <div className="h-40 animate-pulse bg-slate-800/50 rounded-xl" />
          ) : currentPlan ? (
            <div>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h4 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple">{currentPlan.name}</h4>
                  <p className="text-slate-400 mt-1">{currentPlan.durationDays} days access</p>
                </div>
                <span className={`badge ${member.status === 'active' ? 'badge-success' : 'badge-danger'} badge-lg`}>
                  {member.status === 'active' ? '✓ Active' : '✗ Inactive'}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                  <p className="text-slate-500 text-xs mb-1">Started</p>
                  <p className="text-white">{formatDate(member.joinDate)}</p>
                </div>
                <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                  <p className="text-slate-500 text-xs mb-1">Expires</p>
                  <p className={`${isExpiringSoon ? 'text-red-400' : 'text-white'}`}>{formatDate(member.expiryDate)}</p>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-slate-400">Progress</span>
                  <span className={isExpiringSoon ? 'text-red-400' : 'text-slate-300'}>{dLeft != null ? `${dLeft} days left` : 'Expired'}</span>
                </div>
                {/* Progress bar logic (visual only) */}
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full ${isExpiringSoon ? 'bg-red-500' : 'bg-neon-blue'}`} style={{ width: dLeft ? `${Math.max(5, (dLeft / currentPlan.durationDays) * 100)}%` : '0%' }} />
                </div>
              </div>
              
              <button onClick={() => navigate('/member/payments')} className="btn-neon w-full justify-center">
                Renew Plan
              </button>
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">🎫</div>
              <p className="text-slate-300 mb-4">No active membership</p>
              <button onClick={() => navigate('/member/payments')} className="btn-neon">Buy a Plan</button>
            </div>
          )}
        </motion.div>

        {/* Available Plans */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
          <h3 className="text-white font-semibold mb-5">Available Upgrades</h3>
          <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {availablePlans.filter(p => p.id !== member?.planId).map(p => (
              <div key={p.id} className="p-4 rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] transition-colors flex justify-between items-center">
                <div>
                  <h4 className="text-white font-medium">{p.name}</h4>
                  <p className="text-slate-400 text-sm">{p.durationDays} days</p>
                </div>
                <div className="text-right">
                  <p className="text-neon-green font-bold">₹{p.price?.toLocaleString('en-IN')}</p>
                  <button onClick={() => navigate('/member/payments')} className="text-xs text-slate-300 hover:text-white mt-1 border-b border-transparent hover:border-white transition-all">Buy Now</button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
