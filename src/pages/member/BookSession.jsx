// src/pages/member/BookSession.jsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { getDoc, doc, collection, query, where, getDocs, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

const TIME_SLOTS = ['06:00 AM','07:00 AM','08:00 AM','09:00 AM','10:00 AM','04:00 PM','05:00 PM','06:00 PM','07:00 PM','08:00 PM'];

export default function MemberBookSession() {
  const { user, profile } = useAuth();
  const [mentor, setMentor] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState('Personal Training');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [myBookings, setMyBookings] = useState([]);

  const loadBase = async () => {
    try {
      // Get mentorId from users collection (source of truth)
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const mentorId = userDoc.exists() ? userDoc.data().mentorId : null;

      if (mentorId) {
        const mentorDoc = await getDoc(doc(db, 'users', mentorId));
        if (mentorDoc.exists()) setMentor({ id: mentorDoc.id, ...mentorDoc.data() });
      }

      const bSnap = await getDocs(query(collection(db, 'bookings'), where('memberId', '==', user.uid)));
      const bookingsList = bSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => new Date(b.date) - new Date(a.date));
      setMyBookings(bookingsList);
    } catch (e) {
      toast.error('Failed to load mentor info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) loadBase(); }, [user]);

  useEffect(() => {
    if (!mentor || !date) return;
    const fetchSlots = async () => {
      const q = query(collection(db, 'bookings'), where('mentorId', '==', mentor.id), where('date', '==', date));
      const snap = await getDocs(q);
      const booked = snap.docs.filter(d => d.data().status !== 'cancelled').map(d => d.data().time);
      setBookedSlots(booked);
      setSelectedSlot('');
    };
    fetchSlots();
  }, [mentor, date]);

  const handleBook = async (e) => {
    e.preventDefault();
    if (!mentor) { toast.error('No mentor assigned to you'); return; }
    if (!date || !selectedSlot) { toast.error('Please select both date and time slot'); return; }

    // Block past dates
    const todayStr = new Date().toISOString().split('T')[0];
    if (date < todayStr) {
      toast.error('Past dates are not allowed');
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, 'bookings'), {
        memberId: user.uid,
        mentorId: mentor.id,
        date,
        time: selectedSlot,
        sessionType: type,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      toast.success('Session booking requested successfully!');
      setSelectedSlot('');
      loadBase(); // reload bookings
    } catch (e) {
      toast.error('Failed to book: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const cancelBooking = async (id) => {
    if (!confirm('Cancel this booking request?')) return;
    try {
      await updateDoc(doc(db, 'bookings', id), { status: 'cancelled' });
      toast.success('Booking cancelled');
      loadBase();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const statusBadge = (s) => {
    const m = { confirmed: 'badge-success', pending: 'badge-warning', cancelled: 'badge-danger', completed: 'badge-blue' };
    return m[s] || 'badge-gray';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white text-2xl font-bold">Book a Session</h1>
        <p className="text-slate-400 text-sm mt-1">Schedule training with your mentor</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-6 border-neon-green/20">
          <h3 className="text-white font-semibold mb-5">New Booking</h3>
          
          {loading ? (
             <div className="h-40 animate-pulse bg-slate-800/50 rounded-xl" />
          ) : !mentor ? (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
              <p className="text-red-400 font-medium">No mentor assigned.</p>
              <p className="text-sm text-red-400/70 mt-1">You must be assigned a mentor by the admin before you can book sessions.</p>
            </div>
          ) : (
            <form onSubmit={handleBook} className="space-y-5">
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">Trainer</label>
                <div className="form-input bg-white/[0.02] cursor-not-allowed text-slate-300 font-medium opacity-70">
                  {mentor.name} <span className="text-slate-500 text-xs font-normal">({mentor.specialization || 'Mentor'})</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">Date</label>
                  <input type="date" className="form-input" min={new Date().toISOString().split('T')[0]} value={date} onChange={e => setDate(e.target.value)} required />
                </div>
                <div>
                   <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">Session Type</label>
                   <select className="form-input" value={type} onChange={e => setType(e.target.value)}>
                     <option>Personal Training</option>
                     <option>Diet Consultation</option>
                     <option>Fitness Evaluation</option>
                     <option>General Workout</option>
                   </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-medium mb-3 uppercase tracking-wider">Available Time Slots</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {TIME_SLOTS.map(t => {
                    const isBooked = bookedSlots.includes(t);
                    const isSelected = selectedSlot === t;
                    return (
                      <button
                        key={t} type="button" disabled={isBooked}
                        onClick={() => setSelectedSlot(t)}
                        className={`py-2 text-xs rounded-lg transition-all border ${
                          isBooked ? 'bg-white/5 border-white/5 text-slate-600 cursor-not-allowed' :
                          isSelected ? 'bg-neon-green/20 border-neon-green text-neon-green font-bold shadow-[0_0_10px_rgba(0,245,160,0.3)]' :
                          'bg-white/5 border-white/10 text-slate-300 hover:border-neon-green/50 hover:bg-neon-green/5'
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button type="submit" disabled={saving || !selectedSlot} className="btn-neon w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? 'Booking...' : 'Confirm Session Request'}
              </button>
            </form>
          )}
        </motion.div>

        {/* History */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
          <h3 className="text-white font-semibold mb-5">Booking History</h3>
          <div className="max-h-[450px] overflow-y-auto custom-scrollbar pr-2 space-y-3">
            {myBookings.length === 0 ? (
              <p className="text-slate-500 text-center py-10">No past bookings.</p>
            ) : myBookings.map(b => (
              <div key={b.id} className="p-4 rounded-xl border border-white/[0.05] bg-white/[0.02]">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-white font-medium block">{b.date} • {b.time}</span>
                    <span className="text-slate-400 text-xs">{b.sessionType}</span>
                  </div>
                  <span className={`badge ${statusBadge(b.status)}`}>{b.status}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
