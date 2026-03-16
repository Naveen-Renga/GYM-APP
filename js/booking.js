// ============================================================
// BOOKING.JS — Session Booking System
// Used by Members to book sessions with mentors
// ============================================================

async function renderBookingSection(container) {
  const uid = getCurrentUser()?.uid;
  container.innerHTML = `
    <div class="page-header">
      <div><h1 class="page-title">Book a Session</h1><p class="page-subtitle">Schedule training with a mentor</p></div>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><h3>📅 Book New Session</h3></div>
        <div class="booking-form" id="booking-form">
          <div class="form-group">
            <label>Select Mentor</label>
            <select id="book-mentor" onchange="loadMentorSlots()">
              <option value="">— Choose a Mentor —</option>
            </select>
          </div>
          <div class="form-group">
            <label>Session Date</label>
            <input type="date" id="book-date" min="${new Date().toISOString().split('T')[0]}" onchange="loadMentorSlots()" />
          </div>
          <div class="form-group">
            <label>Time Slot</label>
            <div id="time-slots" class="time-slots-grid"></div>
          </div>
          <div class="form-group">
            <label>Session Type</label>
            <select id="book-type">
              <option value="General Training">General Training</option>
              <option value="Weight Training">Weight Training</option>
              <option value="Cardio">Cardio</option>
              <option value="Yoga & Flexibility">Yoga & Flexibility</option>
              <option value="HIIT">HIIT</option>
              <option value="Nutrition Consultation">Nutrition Consultation</option>
            </select>
          </div>
          <div class="form-group">
            <label>Notes (optional)</label>
            <textarea id="book-notes" rows="2" placeholder="Any specific goals or health notes..."></textarea>
          </div>
          <div id="booking-error" class="auth-error"></div>
          <button class="btn btn-primary w-full mt-10" onclick="submitBooking()">Confirm Booking</button>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>📋 My Bookings</h3></div>
        <div id="my-bookings-list"><div class="table-loading">Loading...</div></div>
      </div>
    </div>
  `;

  await loadMentorsForBooking();
  await loadMyBookings();
}

// Available time slots
const TIME_SLOTS = [
  '06:00 AM','07:00 AM','08:00 AM','09:00 AM','10:00 AM','11:00 AM',
  '12:00 PM','01:00 PM','02:00 PM','03:00 PM','04:00 PM','05:00 PM',
  '06:00 PM','07:00 PM','08:00 PM'
];

let selectedTimeSlot = null;

async function loadMentorsForBooking() {
  try {
    const uid = getCurrentUser()?.uid;
    const memberDoc = await db.collection('members').doc(uid).get();
    const m = memberDoc.data() || {};

    const snap = await db.collection('users').where('role','==','mentor').get();
    const select = document.getElementById('book-mentor');
    select.innerHTML = '<option value="">— Choose a Mentor —</option>' +
      snap.docs.map(d => {
        const mentor = d.data();
        const isMyMentor = m.mentorId === d.id;
        return `<option value="${d.id}" ${isMyMentor?'selected':''}>${mentor.name}${isMyMentor?' (My Mentor)':''} — ${mentor.specialization||'General'}</option>`;
      }).join('');

    if (m.mentorId) loadMentorSlots();
  } catch(err) { console.error(err); }
}

async function loadMentorSlots() {
  const mentorId = document.getElementById('book-mentor').value;
  const date     = document.getElementById('book-date').value;

  const slotsEl = document.getElementById('time-slots');
  if (!mentorId || !date) {
    slotsEl.innerHTML = '<p class="slot-hint">Select a mentor and date to see available slots</p>';
    return;
  }

  slotsEl.innerHTML = '<div class="table-loading">Checking availability...</div>';
  selectedTimeSlot = null;

  try {
    // Get already booked slots for this mentor on this date
    const snap = await db.collection('bookings')
      .where('mentorId','==',mentorId)
      .where('date','==',date)
      .where('status','!=','cancelled').get();

    const bookedSlots = snap.docs.map(d => d.data().time);

    slotsEl.innerHTML = TIME_SLOTS.map(slot => {
      const isBooked = bookedSlots.includes(slot);
      return `<button class="time-slot ${isBooked?'slot-booked':'slot-available'}" 
        ${isBooked?'disabled':''} 
        onclick="selectSlot(this,'${slot}')">${slot}</button>`;
    }).join('');
  } catch(err) { console.error(err); }
}

function selectSlot(btn, time) {
  document.querySelectorAll('.time-slot').forEach(b => b.classList.remove('slot-selected'));
  btn.classList.add('slot-selected');
  selectedTimeSlot = time;
}

async function submitBooking() {
  const uid      = getCurrentUser()?.uid;
  const mentorId = document.getElementById('book-mentor').value;
  const date     = document.getElementById('book-date').value;
  const type     = document.getElementById('book-type').value;
  const notes    = document.getElementById('book-notes').value;
  const errEl    = document.getElementById('booking-error');

  if (!mentorId)       { errEl.textContent='Select a mentor';   errEl.classList.add('visible'); return; }
  if (!date)           { errEl.textContent='Select a date';      errEl.classList.add('visible'); return; }
  if (!selectedTimeSlot){ errEl.textContent='Select a time slot'; errEl.classList.add('visible'); return; }

  errEl.classList.remove('visible');

  // Check if member has active membership
  const memberDoc = await db.collection('members').doc(uid).get();
  if (!memberDoc.exists || memberDoc.data().status !== 'active') {
    errEl.textContent = 'You need an active membership to book sessions.';
    errEl.classList.add('visible');
    return;
  }

  try {
    await db.collection('bookings').add({
      memberId:    uid,
      mentorId,
      date,
      time:        selectedTimeSlot,
      sessionType: type,
      notes,
      status:      'pending',
      createdAt:   firebase.firestore.FieldValue.serverTimestamp()
    });

    showToast('🎉 Session booked! Awaiting confirmation.', 'success');
    // Reset form
    document.getElementById('book-date').value = '';
    document.getElementById('book-notes').value = '';
    selectedTimeSlot = null;
    document.getElementById('time-slots').innerHTML = '<p class="slot-hint">Select a mentor and date to see available slots</p>';
    await loadMyBookings();
  } catch(err) {
    errEl.textContent = 'Booking failed: '+err.message;
    errEl.classList.add('visible');
  }
}

async function loadMyBookings() {
  const uid = getCurrentUser()?.uid;
  try {
    const snap = await db.collection('bookings')
      .where('memberId','==',uid)
      .orderBy('date','desc').limit(20).get();

    if (snap.empty) {
      document.getElementById('my-bookings-list').innerHTML = '<p class="empty-msg">No bookings yet. Book your first session!</p>';
      return;
    }

    const rows = await Promise.all(snap.docs.map(async d => {
      const b = d.data();
      const mDoc = b.mentorId ? await db.collection('users').doc(b.mentorId).get() : null;
      return { id: d.id, ...b, mentorName: mDoc?.data()?.name||'—' };
    }));

    document.getElementById('my-bookings-list').innerHTML = `
      <div class="booking-list">${rows.map(r => `
        <div class="booking-item">
          <div class="bi-date">
            <div class="bi-day">${r.date ? new Date(r.date).getDate() : '—'}</div>
            <div class="bi-month">${r.date ? new Date(r.date).toLocaleDateString('en-IN',{month:'short'}) : ''}</div>
          </div>
          <div class="bi-info">
            <div class="bi-title">${r.sessionType||'General Training'}</div>
            <div class="bi-meta">${r.time||'—'} · with ${r.mentorName}</div>
          </div>
          <div class="bi-right">
            <span class="badge badge-${r.status==='confirmed'?'success':r.status==='cancelled'?'danger':'warning'}">${r.status}</span>
            ${r.status!=='cancelled'?`<button class="btn btn-xs btn-danger mt-5" onclick="cancelBooking('${r.id}')">Cancel</button>`:''}
          </div>
        </div>`).join('')}
      </div>`;
  } catch(err) { console.error(err); }
}

async function cancelBooking(id) {
  if (!confirm('Cancel this session?')) return;
  await db.collection('bookings').doc(id).update({ status: 'cancelled' });
  showToast('Booking cancelled.', 'info');
  await loadMyBookings();
}
