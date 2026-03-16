// src/pages/member/Payments.jsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, doc, getDoc, setDoc, updateDoc, serverTimestamp, runTransaction } from 'firebase/firestore';

export default function MemberPayments() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [method, setMethod] = useState('upi');

  const loadData = async () => {
    try {
      const [pSnap, paySnap] = await Promise.all([
        getDocs(collection(db, 'plans')),
        getDocs(query(collection(db, 'payments'), where('memberId', '==', user.uid)))
      ]);

      const planList = pSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => a.price - b.price);
      setPlans(planList);

      const pMap = {};
      planList.forEach(p => (pMap[p.id] = p.name));

      const payList = paySnap.docs.map(d => ({
        id: d.id, ...d.data(), planName: pMap[d.data().planId] || 'Unknown Plan'
      })).sort((a,b) => b.date?.toMillis() - a.date?.toMillis());
      
      setPayments(payList);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) loadData(); }, [user]);

  const initiatePayment = (plan) => {
    setSelectedPlan(plan);
    setShowPayModal(true);
  };

  const processPayment = async (e) => {
    e.preventDefault();
    if (!selectedPlan) return;
    
    setProcessing(true);
    
    // Simulate payment delay
    await new Promise(r => setTimeout(r, 1500));

    try {
      const planId = selectedPlan.id;
      const days = selectedPlan.durationDays;
      const price = selectedPlan.price;
      
      // Calculate new expiry date
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + days);

      // We need to write to payments, members, and potentially users (if member doc doesn't exist)
      // Since member doc might not exist if admin just created user in auth but not yet fully configured,
      // we'll handle it carefully. The admin creates members, so it should exist.
      
      const memberRef = doc(db, 'members', user.uid);
      const mDoc = await getDoc(memberRef);
      
      const updateData = {
        planId,
        status: 'active',
        expiryDate: expiry
      };

      if (mDoc.exists()) {
        await updateDoc(memberRef, updateData);
      } else {
        // Fallback info if somehow not created
        const uDoc = await getDoc(doc(db, 'users', user.uid));
        await setDoc(memberRef, {
          ...updateData,
          name: uDoc.exists() ? uDoc.data().name : 'User',
          email: uDoc.exists() ? uDoc.data().email : user.email,
          joinDate: serverTimestamp()
        });
      }

      // Record payment
      const pRef = doc(collection(db, 'payments'));
      await setDoc(pRef, {
        memberId: user.uid,
        planId,
        amount: price,
        method,
        status: 'completed',
        date: serverTimestamp(),
        txnId: 'TXN' + Math.random().toString(36).slice(2,10).toUpperCase()
      });

      toast.success('🎉 Payment successful! Membership activated.');
      setShowPayModal(false);
      loadData(); // reload
    } catch (err) {
      toast.error('Payment failed: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return '—';
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white text-2xl font-bold">Payments</h1>
        <p className="text-slate-400 text-sm mt-1">Manage your subscriptions and billing</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Plans */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <h3 className="text-white font-semibold mb-5">Buy / Renew Plan</h3>
          
          {loading ? (
             <div className="space-y-4">{[1,2].map(i => <div key={i} className="h-24 animate-pulse bg-slate-800/50 rounded-xl" />)}</div>
          ) : plans.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No plans available.</p>
          ) : (
            <div className="space-y-4">
              {plans.map((p, i) => (
                <div key={p.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] flex justify-between items-center group hover:bg-white/[0.04] transition-all">
                  <div>
                    <h4 className="text-white font-medium flex items-center gap-2">
                      {p.name}
                      {p.isPopular && <span className="badge badge-success text-[10px] py-0.5">Popular</span>}
                    </h4>
                    <p className="text-slate-400 text-xs mt-1">{p.durationDays} days access </p>
                    <p className="text-slate-500 text-[10px] mt-0.5 line-clamp-1">{(p.features || '').replace(/\n/g, ', ')}</p>
                  </div>
                  <div className="text-right pl-4">
                    <p className="text-gold font-bold text-lg leading-tight mb-2">₹{p.price.toLocaleString('en-IN')}</p>
                    <button onClick={() => initiatePayment(p)} className="px-4 py-1.5 rounded-lg bg-neon-green/20 text-neon-green text-xs font-medium hover:bg-neon-green/30 transition-all border border-neon-green/30">
                      Choose
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* History */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
           <h3 className="text-white font-semibold mb-5">Payment History</h3>
           
           {loading ? (
             <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-16 animate-pulse bg-slate-800/50 rounded-xl" />)}</div>
           ) : payments.length === 0 ? (
             <div className="text-center py-12">
               <div className="text-4xl mb-3 text-slate-600">📜</div>
               <p className="text-slate-500">No payment records yet.</p>
             </div>
           ) : (
             <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
               {payments.map((pay, i) => (
                  <div key={pay.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] flex justify-between items-center">
                    <div className="flex gap-4 items-center">
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-lg">💳</div>
                      <div>
                        <p className="text-white font-medium">{pay.planName}</p>
                        <p className="text-slate-500 text-xs">{formatDate(pay.date)} • {String(pay.method || 'upi').toUpperCase()}</p>
                        <p className="text-slate-600 font-mono text-[10px] mt-0.5">{pay.txnId || pay.id}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold flex items-center gap-2 justify-end">
                        ₹{Number(pay.amount).toLocaleString('en-IN')}
                      </p>
                      <span className={`badge ${pay.status === 'completed' ? 'badge-success' : 'badge-warning'} text-[10px] mt-1 inline-block`}>
                        {pay.status}
                      </span>
                    </div>
                  </div>
               ))}
             </div>
           )}
        </motion.div>
      </div>

      {/* Payment Modal */}
      <Modal open={showPayModal} onClose={() => setShowPayModal(false)} title="Complete Purchase">
        {selectedPlan && (
          <form onSubmit={processPayment} className="space-y-5">
            <div className="p-5 rounded-xl bg-gradient-to-br from-neon-blue/10 to-purple-500/10 border border-neon-blue/20 text-center">
              <p className="text-white font-bold text-lg">{selectedPlan.name}</p>
              <p className="text-slate-400 text-sm">{selectedPlan.durationDays} days membership</p>
              <p className="text-neon-green font-black text-3xl mt-2">₹{selectedPlan.price.toLocaleString('en-IN')}</p>
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-medium mb-3 uppercase tracking-wider">Payment Method</label>
              <div className="grid grid-cols-2 gap-3">
                <div 
                  onClick={() => setMethod('upi')}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 cursor-pointer transition-all ${method === 'upi' ? 'border-neon-blue bg-neon-blue/10 text-white' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}
                >
                  <span className="text-xl">📱</span> UPI
                </div>
                <div 
                  onClick={() => setMethod('card')}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 cursor-pointer transition-all ${method === 'card' ? 'border-neon-blue bg-neon-blue/10 text-white' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}
                >
                  <span className="text-xl">💳</span> Card
                </div>
              </div>
            </div>

            {method === 'upi' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">UPI ID</label>
                <input type="text" className="form-input" placeholder="example@oksbi" required />
              </motion.div>
            )}

            {method === 'card' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
                <input type="text" className="form-input" placeholder="Card Number (0000 0000 0000 0000)" required />
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" className="form-input" placeholder="MM/YY" required />
                  <input type="text" className="form-input" placeholder="CVV" required />
                </div>
              </motion.div>
            )}

            <button type="submit" disabled={processing} className="btn-neon w-full justify-center flex items-center gap-2">
              {processing ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : 'Secure Pay 🔒'}
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}
