// src/firebase/firestore.js
import {
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp, Timestamp, getCountFromServer, onSnapshot, and, or
} from 'firebase/firestore';
import { db } from './config';

// ─── USERS ──────────────────────────────────────────────────
export const getUser = (uid) => getDoc(doc(db, 'users', uid));
export const updateUser = (uid, data) => updateDoc(doc(db, 'users', uid), data);
export const createUserDoc = (uid, data) =>
  setDoc(doc(db, 'users', uid), { ...data, createdAt: serverTimestamp() });

// ─── MENTORS ─────────────────────────────────────────────────
export const getAllMentors = () =>
  getDocs(query(collection(db, 'users'), where('role', '==', 'mentor')));

export const createMentor = (uid, data) =>
  setDoc(doc(db, 'users', uid), {
    ...data, role: 'mentor', createdAt: serverTimestamp()
  });

export const promoteToMentor = async (email, name, specialization, phone) => {
  const q = query(collection(db, 'users'), where('email', '==', email), limit(1));
  const snap = await getDocs(q);
  
  if (!snap.empty) {
    const userDoc = snap.docs[0];
    const updateData = {
      role: 'mentor',
      specialization: specialization || 'General',
      phone: phone || userDoc.data().phone || ''
    };
    if (name) updateData.name = name;
    await updateDoc(doc(db, 'users', userDoc.id), updateData);
    return { id: userDoc.id, ...userDoc.data(), ...updateData, role: 'mentor' };
  } else {
    const uid = `mentor_${Date.now()}`;
    const data = { email, name: name || email.split('@')[0], role: 'mentor', specialization, phone };
    await setDoc(doc(db, 'users', uid), { ...data, createdAt: serverTimestamp() });
    return { id: uid, ...data };
  }
};

export const getStudentsForMentor = (mentorId) =>
  getDocs(query(
    collection(db, 'users'), 
    where('mentorId', '==', mentorId), 
    where('role', '==', 'member')
  ));

export const deleteMentor = async (uid) => {
  await deleteDoc(doc(db, 'users', uid));
};

// ─── MEMBERS ─────────────────────────────────────────────────
export const getAllMembers = () =>
  getDocs(query(collection(db, 'users'), where('role', '==', 'member')));

export const getMemberInfo = (uid) => getDoc(doc(db, 'members', uid));

export const createMember = async (uid, userData, memberData) => {
  await setDoc(doc(db, 'users', uid), {
    ...userData, 
    role: 'member', 
    mentorId: memberData.mentorId || null,
    createdAt: serverTimestamp()
  });
  await setDoc(doc(db, 'members', uid), {
    ...memberData, joinDate: serverTimestamp()
  });
};

export const deleteMember = async (uid) => {
  await deleteDoc(doc(db, 'users', uid));
  await deleteDoc(doc(db, 'members', uid));
};

export const assignMentorToMember = async (memberId, mentorId) => {
  await updateDoc(doc(db, 'members', memberId), { mentorId });
  await updateDoc(doc(db, 'users', memberId), { mentorId });
};

export const assignPlanToMember = async (memberId, planId, durationDays) => {
  const now = new Date();
  const end = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
  const data = {
    planId,
    membershipStart: Timestamp.fromDate(now),
    membershipEnd: Timestamp.fromDate(end),
    status: 'active',
  };
  await updateDoc(doc(db, 'users', memberId), data);
  await updateDoc(doc(db, 'members', memberId), data);
};

// ─── PLANS ───────────────────────────────────────────────────
export const getAllPlans = () =>
  getDocs(query(collection(db, 'plans'), orderBy('price')));

export const createPlan = (data) =>
  addDoc(collection(db, 'plans'), data);

export const updatePlan = (id, data) => updateDoc(doc(db, 'plans', id), data);

export const deletePlan = (id) => deleteDoc(doc(db, 'plans', id));

// ─── BOOKINGS ─────────────────────────────────────────────────
export const getAllBookings = () =>
  getDocs(query(collection(db, 'bookings'), orderBy('createdAt', 'desc')));

export const getMentorBookings = (mentorId) =>
  getDocs(query(collection(db, 'bookings'), where('mentorId', '==', mentorId)));

export const getMemberBookings = (memberId) =>
  getDocs(query(collection(db, 'bookings'), where('memberId', '==', memberId)));

export const createBooking = (data) =>
  addDoc(collection(db, 'bookings'), { ...data, status: 'pending', createdAt: serverTimestamp() });

export const updateBookingStatus = (id, status) =>
  updateDoc(doc(db, 'bookings', id), { status });

export const getPendingBookings = (mentorId) =>
  getDocs(query(
    collection(db, 'bookings'),
    where('mentorId', '==', mentorId),
    where('status', '==', 'pending')
  ));

// ─── PAYMENTS ─────────────────────────────────────────────────
export const getAllPayments = () =>
  getDocs(query(collection(db, 'payments'), orderBy('date', 'desc')));

export const getMemberPayments = (memberId) =>
  getDocs(query(collection(db, 'payments'), where('memberId', '==', memberId), orderBy('date', 'desc')));

// ─── MEMBER NOTES (from Mentor) ───────────────────────────────
export const getMemberNotes = (memberId) =>
  getDoc(doc(db, 'memberNotes', memberId));

export const saveMemberNotes = (memberId, data) =>
  setDoc(doc(db, 'memberNotes', memberId), {
    ...data, updatedAt: serverTimestamp()
  }, { merge: true });

// ─── WORKOUT PLANS ────────────────────────────────────────────
export const createWorkoutPlan = (data) =>
  addDoc(collection(db, 'workoutPlans'), { ...data, createdAt: serverTimestamp() });

export const getMemberWorkoutPlans = (memberId) =>
  getDocs(query(collection(db, 'workoutPlans'), where('memberId', '==', memberId)));

export const getMentorWorkoutPlans = (mentorId) =>
  getDocs(query(collection(db, 'workoutPlans'), where('mentorId', '==', mentorId)));

export const deleteWorkoutPlan = (id) => deleteDoc(doc(db, 'workoutPlans', id));

// ─── STATS ────────────────────────────────────────────────────
export const getAdminStats = async () => {
  const [membersSnap, mentorsSnap, paymentsSnap] = await Promise.all([
    getDocs(query(collection(db, 'users'), where('role', '==', 'member'))),
    getDocs(query(collection(db, 'users'), where('role', '==', 'mentor'))),
    getDocs(query(collection(db, 'payments'), where('status', '==', 'completed'))),
  ]);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  let monthRevenue = 0;
  paymentsSnap.docs.forEach(d => {
    const p = d.data();
    const date = p.date?.toDate ? p.date.toDate() : new Date(p.date);
    if (date >= startOfMonth) monthRevenue += Number(p.amount || 0);
  });

  return {
    totalMembers: membersSnap.size,
    activeMembers: membersSnap.docs.filter(d => d.data().status === 'active').length,
    totalMentors: mentorsSnap.size,
    monthRevenue,
  };
};

export const getMentorStats = async (mentorId) => {
  const today = new Date().toISOString().split('T')[0];
  const startOfMonth = new Date();
  startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);

  const [studentsSnap, bookingsSnap] = await Promise.all([
    getDocs(query(collection(db, 'users'), where('mentorId', '==', mentorId), where('role', '==', 'member'))),
    getDocs(query(collection(db, 'bookings'), where('mentorId', '==', mentorId))),
  ]);

  let todayCount = 0, pendingCount = 0, monthCompleted = 0;
  bookingsSnap.docs.forEach(d => {
    const b = d.data();
    if (b.date === today && b.status !== 'cancelled') todayCount++;
    if (b.status === 'pending') pendingCount++;
    if (b.status === 'completed' && new Date(b.date) >= startOfMonth) monthCompleted++;
  });

  return {
    myStudents: studentsSnap.size,
    todaySessions: todayCount,
    pendingRequests: pendingCount,
    monthCompleted,
  };
};

export const sendMessage = (senderId, receiverId, text) =>
  addDoc(collection(db, 'messages'), {
    senderId,
    receiverId,
    text,
    createdAt: serverTimestamp()
  });

export const getMessagesQuery = (uid1, uid2) => {
  return query(
    collection(db, 'messages'),
    or(
      and(where('senderId', '==', uid1), where('receiverId', '==', uid2)),
      and(where('senderId', '==', uid2), where('receiverId', '==', uid1))
    )
  );
};

// ─── ATTENDANCE ───────────────────────────────────────────────
export const markAttendance = (data) =>
  addDoc(collection(db, 'attendance'), { ...data, createdAt: serverTimestamp() });

export const updateAttendance = (id, data) => updateDoc(doc(db, 'attendance', id), data);

export const getMemberAttendance = (memberId) =>
  getDocs(query(
    collection(db, 'attendance'),
    where('memberId', '==', memberId)
  ));

export const getMentorAttendance = (mentorId) =>
  getDocs(query(
    collection(db, 'attendance'),
    where('mentorId', '==', mentorId)
  ));

export const getAttendanceForMemberByMentor = (memberId, mentorId) =>
  getDocs(query(
    collection(db, 'attendance'),
    where('memberId', '==', memberId),
    where('mentorId', '==', mentorId)
  ));

export const checkAttendanceExists = (memberId, date) =>
  getDocs(query(
    collection(db, 'attendance'),
    where('memberId', '==', memberId),
    where('date', '==', date)
  ));

// ─── MEMBER FEEDBACK (to Mentor) ─────────────────────────────
export const saveMemberFeedback = (memberId, mentorId, text) =>
  setDoc(doc(db, 'memberFeedbacks', memberId), {
    memberId,
    mentorId,
    text,
    updatedAt: serverTimestamp(),
    mentorSeen: false
  });

export const getMemberFeedback = (memberId) =>
  getDoc(doc(db, 'memberFeedbacks', memberId));

export const getMentorFeedbacks = (mentorId) =>
  getDocs(query(collection(db, 'memberFeedbacks'), where('mentorId', '==', mentorId)));

export const markFeedbackAsSeen = (memberId) =>
  updateDoc(doc(db, 'memberFeedbacks', memberId), { mentorSeen: true });

