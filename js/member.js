// ============================================================
// MEMBER.JS — Member Dashboard Logic
// ============================================================

let currentUser = null;
let currentProfile = null;
let currentPage = 'home';
let selectedBookingSlot = null;
let selectedPayMethod = 'upi';

// ── INIT ─────────────────────────────────────────────────────
firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        try {
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) {
                currentProfile = doc.data();
                if (currentProfile.role !== 'member') {
                    window.location.href = "login.html";
                    return;
                }
                setupSidebarUser();
                loadPage('home');
                setTimeout(() => document.getElementById('page-loader').classList.add('hidden'), 600);
            } else {
                firebase.auth().signOut();
                window.location.href = "login.html";
            }
        } catch (e) {
            console.error(e);
            firebase.auth().signOut();
            window.location.href = "login.html";
        }
    } else {
        window.location.href = "login.html";
    }
});

function setupSidebarUser() {
    const p = currentProfile;
    document.getElementById('user-name-sidebar').textContent = p.name || 'User';
    const av = document.getElementById('user-avatar-sidebar');
    if (p.profileImage) {
        av.innerHTML = `<img src="${p.profileImage}" alt="">`;
    } else {
        av.textContent = (p.name || 'U').charAt(0).toUpperCase();
    }
}

// ── PAGE ROUTING ─────────────────────────────────────────────
async function loadPage(pageId) {
    currentPage = pageId;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navEl = document.getElementById(`nav-${pageId}`);
    if (navEl) navEl.classList.add('active');

    const titles = {
        home: 'Dashboard', 'my-plan': 'My Membership', 'my-mentor': 'My Mentor',
        book: 'Book Session', 'my-workout': 'Workout Plan', 'my-payments': 'Payment History',
        profile: 'Profile', progress: 'Progress Tracking'
    };
    document.getElementById('topbar-title').textContent = titles[pageId] || 'Dashboard';
    document.getElementById('topbar-breadcrumb').textContent = `IronForge › ${titles[pageId] || ''}`;

    const content = document.getElementById('main-content');
    content.innerHTML = `<div class="empty-state"><div class="empty-icon" style="animation:spin 1s linear infinite">⚙️</div><h3>Loading...</h3></div>`;

    switch(pageId) {
        case 'home':        await renderMemberOverview(content); break;
        case 'my-plan':     await renderMemberMembership(content); break;
        case 'my-mentor':   await renderMemberMentor(content); break;
        case 'book':        renderBookingSection(content); break;
        case 'my-workout':  await renderWorkoutPage(content); break;
        case 'my-payments': await renderMemberPayments(content); break;
        case 'profile':     await renderProfilePage(); break;
        case 'progress':    await renderMemberProgress(content); break;
        default: content.innerHTML = '<div class="empty-state"><div class="empty-icon">🚧</div><h3>Coming Soon</h3></div>';
    }
}

// Formatting helpers
function formatINR(val) { return '₹' + parseInt(val).toLocaleString('en-IN'); }
function formatDate(timestamp) {
    if (!timestamp) return '—';
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function daysRemaining(timestamp) {
    if (!timestamp) return null;
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diff = d.getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
}
function showToast(msg, type='info') {
    alert(msg); // Placeholder for toast system
}

// ── UI HELPERS ───────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebar-overlay').classList.toggle('show');
}
function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('show');
}
async function handleLogout() {
    await auth.signOut();
    window.location.href = 'login.html';
}
function toggleNotif() {
    document.getElementById('notif-panel').classList.toggle('hidden');
}

// ══════════════════════════════════════════════════════════════
// OVERVIEW
// ══════════════════════════════════════════════════════════════
async function renderMemberOverview(container) {
    const user = currentProfile;
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">My Dashboard</h1>
          <p class="page-subtitle">Welcome back, ${user?.name} 💪</p>
        </div>
        <div class="header-date">${new Date().toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
      </div>
      <div class="stats-grid" id="member-stats">
        ${['Membership Status','Days Remaining','Next Session','Total Sessions'].map(t=>`
          <div class="stat-card skeleton"><div class="stat-label">${t}</div><div class="stat-value">—</div></div>`).join('')}
      </div>
      <div class="grid-2 mt-20">
        <div class="card"><div class="card-header"><h3>🎫 My Membership</h3></div><div id="mem-overview-card"><div class="table-loading">Loading...</div></div></div>
        <div class="card"><div class="card-header"><h3>📅 Upcoming Sessions</h3></div><div id="mem-upcoming-sessions"><div class="table-loading">Loading...</div></div></div>
      </div>
      <div class="card mt-20">
        <div class="card-header"><h3>📝 My Workout Plan</h3></div>
        <div id="mem-workout-plan"><div class="table-loading">Loading...</div></div>
      </div>
    `;
    await loadMemberStats();
    await loadMembershipOverview();
    await loadUpcomingSessions();
    await loadWorkoutPlan();
}

async function loadMemberStats() {
    const uid = currentUser.uid;
    try {
        const [memberDoc, bookingsSnap] = await Promise.all([
            db.collection('members').doc(uid).get(),
            db.collection('bookings').where('memberId','==',uid).get()
        ]);

        const m = memberDoc.exists ? memberDoc.data() : {};
        const days = daysRemaining(m.expiryDate);

        const upcoming = bookingsSnap.docs.filter(d => {
            const bDate = new Date(d.data().date);
            return bDate >= new Date() && d.data().status !== 'cancelled';
        });

        upcoming.sort((a,b) => a.data().date?.localeCompare(b.data().date));
        const next = upcoming[0]?.data();

        document.getElementById('member-stats').innerHTML = `
        <div class="stat-card stat-${m.status==='active'?'green':'red'}">
          <div class="stat-icon">${m.status==='active'?'✅':'❌'}</div>
          <div class="stat-info"><div class="stat-label">Membership Status</div><div class="stat-value">${m.status==='active'?'Active':'Inactive'}</div></div>
        </div>
        <div class="stat-card stat-${days!=null&&days<=7?'red':days!=null&&days<=30?'gold':'blue'}">
          <div class="stat-icon">⏱️</div>
          <div class="stat-info"><div class="stat-label">Days Remaining</div><div class="stat-value">${days!=null?days+'d':'—'}</div><div class="stat-trend">${formatDate(m.expiryDate)}</div></div>
        </div>
        <div class="stat-card stat-gold">
          <div class="stat-icon">📅</div>
          <div class="stat-info"><div class="stat-label">Next Session</div><div class="stat-value">${next?(next.date+' '+next.time):'None'}</div></div>
        </div>
        <div class="stat-card stat-blue">
          <div class="stat-icon">🏋️</div>
          <div class="stat-info"><div class="stat-label">Total Sessions</div><div class="stat-value">${bookingsSnap.size}</div></div>
        </div>
      `;
    } catch(err) { console.error(err); }
}

async function loadMembershipOverview() {
    const uid = currentUser.uid;
    try {
        const memberDoc = await db.collection('members').doc(uid).get();
        const m = memberDoc.exists ? memberDoc.data() : {};
        let planData = null;
        if (m.planId) {
            const planDoc = await db.collection('plans').doc(m.planId).get();
            if (planDoc.exists) planData = planDoc.data();
        }
        const days = daysRemaining(m.expiryDate);
        const pct = m.expiryDate && m.joinDate ? Math.max(0, Math.min(100, Math.round((1 - days / ((m.expiryDate.toDate()-m.joinDate.toDate())/(1000*60*60*24)))*100))) : 0;

        document.getElementById('mem-overview-card').innerHTML = m.planId && planData ? `
        <div class="membership-card">
          <div class="membership-plan-name">${planData.name}</div>
          <div class="membership-price">${formatINR(planData.price)} <span>/ ${planData.durationDays} days</span></div>
          <div class="membership-dates">
            <div><label>Started</label><span>${formatDate(m.joinDate)}</span></div>
            <div><label>Expires</label><span class="${days!=null&&days<=7?'text-danger':''}">${formatDate(m.expiryDate)}</span></div>
          </div>
          <div class="progress-bar-wrap">
            <div class="progress-bar-label"><span>Progress</span><span>${pct}% used</span></div>
            <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
          </div>
          <div class="membership-footer">
            <span class="badge badge-${m.status==='active'?'success':'inactive'}">${m.status || 'inactive'}</span>
            <button class="btn btn-sm btn-primary" onclick="loadPage('my-payments')">Renew Plan</button>
          </div>
        </div>` : `
        <div class="empty-membership">
          <div class="empty-icon">🎫</div>
          <p>No active membership</p>
          <button class="btn btn-primary" onclick="loadPage('my-payments')">Buy a Plan</button>
        </div>`;
    } catch(err) { console.error(err); }
}

async function loadUpcomingSessions() {
    const uid = currentUser.uid;
    try {
        const snap = await db.collection('bookings')
            .where('memberId','==',uid)
            .orderBy('date','asc').limit(5).get();

        const upcoming = snap.docs.filter(d => {
            const b = d.data();
            return new Date(b.date) >= new Date() && b.status !== 'cancelled';
        });

        if (!upcoming.length) {
            document.getElementById('mem-upcoming-sessions').innerHTML = `
          <div class="empty-msg">No upcoming sessions<br/><button class="btn btn-sm btn-outline mt-10" onclick="loadPage('book')">Book Now</button></div>`;
            return;
        }

        const rows = await Promise.all(upcoming.map(async d => {
            const b = d.data();
            const mDoc = b.mentorId ? await db.collection('users').doc(b.mentorId).get() : null;
            return { ...b, id: d.id, mentorName: mDoc?.exists ? mDoc.data().name : '—' };
        }));
        document.getElementById('mem-upcoming-sessions').innerHTML = `
        <div class="session-list">${rows.map(r=>`
          <div class="session-item">
            <div class="session-time">${r.date} · ${r.time||'—'}</div>
            <div class="session-info">
              <div class="session-member">With ${r.mentorName}</div>
              <div class="session-type">${r.sessionType||'General Training'}</div>
            </div>
            <span class="badge badge-${r.status==='confirmed'?'success':'warning'}">${r.status}</span>
          </div>`).join('')}
        </div>`;
    } catch(err) { console.error(err); }
}

async function loadWorkoutPlan() {
    const uid = currentUser.uid;
    try {
        const doc = await db.collection('memberNotes').doc(uid).get();
        if (!doc.exists || (!doc.data().workout && !doc.data().diet)) {
            document.getElementById('mem-workout-plan').innerHTML = '<p class="empty-msg">Your mentor hasn\'t added a workout plan yet. Check back soon!</p>';
            return;
        }
        const notes = doc.data();
        document.getElementById('mem-workout-plan').innerHTML = `
        <div class="workout-plan-grid">
          ${notes.workout?`<div class="workout-section"><h4>🏋️ Workout Plan</h4><pre class="workout-text">${notes.workout}</pre></div>`:''}
          ${notes.diet?`<div class="workout-section"><h4>🥗 Diet Plan</h4><pre class="workout-text">${notes.diet}</pre></div>`:''}
          ${notes.progress?`<div class="workout-section"><h4>📈 Progress Notes</h4><pre class="workout-text">${notes.progress}</pre></div>`:''}
        </div>`;
    } catch(err) { console.error(err); }
}

async function renderWorkoutPage(container) {
    container.innerHTML = `
      <div class="page-header"><div><h1 class="page-title">My Workout Plan</h1><p class="page-subtitle">Your personalized regimen</p></div></div>
      <div id="full-workout-plan"><div class="table-loading">Loading...</div></div>
    `;
    const uid = currentUser.uid;
    try {
        const doc = await db.collection('memberNotes').doc(uid).get();
        if (!doc.exists || (!doc.data().workout && !doc.data().diet)) {
            document.getElementById('full-workout-plan').innerHTML = `
            <div class="empty-state"><div class="empty-icon">💪</div><h3>No Workout Plan Yet</h3><p>Your mentor will assign your workout plan here.</p></div>
            `;
            return;
        }
        const notes = doc.data();
        document.getElementById('full-workout-plan').innerHTML = `
        <div class="workout-plan-grid">
          ${notes.workout?`<div class="workout-section"><h4>🏋️ Workout Plan</h4><pre class="workout-text">${notes.workout}</pre></div>`:''}
          ${notes.diet?`<div class="workout-section"><h4>🥗 Diet Plan</h4><pre class="workout-text">${notes.diet}</pre></div>`:''}
          ${notes.progress?`<div class="workout-section"><h4>📈 Progress Notes</h4><pre class="workout-text">${notes.progress}</pre></div>`:''}
        </div>`;
    } catch(err) { console.error(err); }
}

// ══════════════════════════════════════════════════════════════
// MEMBERSHIP DETAILS
// ══════════════════════════════════════════════════════════════
async function renderMemberMembership(container) {
    container.innerHTML = `
      <div class="page-header"><div><h1 class="page-title">My Membership</h1><p class="page-subtitle">Membership plan details</p></div></div>
      <div id="membership-detail"><div class="table-loading">Loading...</div></div>
    `;
    await loadMembershipDetail();
}

async function loadMembershipDetail() {
    const uid = currentUser.uid;
    try {
        const [memberDoc, plansSnap] = await Promise.all([
            db.collection('members').doc(uid).get(),
            db.collection('plans').get()
        ]);
        const m = memberDoc.exists ? memberDoc.data() : {};
        const plans = plansSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        let currentPlan = m.planId ? plans.find(p=>p.id===m.planId) : null;
        const days = daysRemaining(m.expiryDate);

        document.getElementById('membership-detail').innerHTML = `
        <div class="grid-2">
          <div class="card">
            <div class="card-header"><h3>Current Plan</h3></div>
            ${currentPlan ? `
            <div class="current-plan-display">
              <div class="cpd-name">${currentPlan.name}</div>
              <div class="cpd-price">${formatINR(currentPlan.price)}</div>
              <div class="cpd-duration">${currentPlan.durationDays} days plan</div>
              <div class="cpd-dates">
                <div class="cpd-date-item"><label>Join Date</label><span>${formatDate(m.joinDate)}</span></div>
                <div class="cpd-date-item"><label>Expiry</label><span class="${days!=null&&days<=7?'text-danger':''}">${formatDate(m.expiryDate)}</span></div>
                <div class="cpd-date-item"><label>Days Left</label><span class="${days!=null&&days<=7?'text-danger':''}">${days!=null?days+' days':'—'}</span></div>
              </div>
              <span class="badge badge-${m.status==='active'?'success':'inactive'} badge-lg">${m.status==='active'?'✓ Active':'✗ Inactive'}</span>
            </div>` : '<p class="empty-msg">No active plan. Purchase one below!</p>'}
          </div>
          <div class="card">
            <div class="card-header"><h3>Available Plans</h3></div>
            <div class="plans-list">${plans.map(p=>`
              <div class="plan-list-item ${m.planId===p.id?'plan-current':''}">
                <div class="plan-list-info">
                  <div class="plan-list-name">${p.name} ${m.planId===p.id?'<span class="badge badge-success badge-sm">Current</span>':''}</div>
                  <div class="plan-list-duration">${p.durationDays} days</div>
                </div>
                <div class="plan-list-price">${formatINR(p.price)}</div>
                <button class="btn btn-sm btn-primary" onclick="loadPage('my-payments')">
                  ${m.planId===p.id?'Renew':'Buy'}
                </button>
              </div>`).join('')}
            </div>
          </div>
        </div>`;
    } catch(err) { console.error(err); }
}

// ══════════════════════════════════════════════════════════════
// MY MENTOR
// ══════════════════════════════════════════════════════════════
async function renderMemberMentor(container) {
    const uid = currentUser.uid;
    container.innerHTML = `
      <div class="page-header"><div><h1 class="page-title">My Mentor</h1><p class="page-subtitle">Your personal trainer details</p></div></div>
      <div id="mentor-detail"><div class="table-loading">Loading...</div></div>
    `;
    try {
        const memberDoc = await db.collection('members').doc(uid).get();
        const m = memberDoc.exists ? memberDoc.data() : {};
        if (!m.mentorId) {
            document.getElementById('mentor-detail').innerHTML = `
          <div class="empty-state"><div class="empty-icon">🏋️</div><h3>No Mentor Assigned</h3><p>Contact the admin to get a mentor assigned to you.</p></div>`;
            return;
        }
        const [mentorDoc, notesDoc, bookingsSnap] = await Promise.all([
            db.collection('users').doc(m.mentorId).get(),
            db.collection('memberNotes').doc(uid).get(),
            db.collection('bookings').where('memberId','==',uid).where('mentorId','==',m.mentorId).get()
        ]);
        const mentor = mentorDoc.exists ? mentorDoc.data() : {};
        const notes  = notesDoc.exists ? notesDoc.data() : {};
        const sessionCount = bookingsSnap.size;

        document.getElementById('mentor-detail').innerHTML = `
        <div class="mentor-profile-card">
          <div class="mpc-avatar">${(mentor.name||'?')[0].toUpperCase()}</div>
          <div class="mpc-info">
            <div class="mpc-name">${mentor.name}</div>
            <div class="mpc-spec">${mentor.specialization || 'Personal Trainer'}</div>
            <div class="mpc-contact">
              <span>📧 ${mentor.email}</span>
              <span>📱 ${mentor.phone||'—'}</span>
            </div>
            <div class="mpc-stats">
              <div class="mpc-stat"><div class="mpc-stat-val">${sessionCount}</div><div class="mpc-stat-label">Sessions Together</div></div>
            </div>
          </div>
        </div>
        ${notes.workout||notes.diet||notes.progress ? `
        <div class="card mt-20">
          <div class="card-header"><h3>📋 Notes from Your Mentor</h3></div>
          <div class="workout-plan-grid">
            ${notes.workout?`<div class="workout-section"><h4>🏋️ Workout Plan</h4><pre class="workout-text">${notes.workout}</pre></div>`:''}
            ${notes.diet?`<div class="workout-section"><h4>🥗 Diet Notes</h4><pre class="workout-text">${notes.diet}</pre></div>`:''}
            ${notes.progress?`<div class="workout-section"><h4>📈 Progress Notes</h4><pre class="workout-text">${notes.progress}</pre></div>`:''}
          </div>
        </div>` : '<div class="card mt-20"><p class="empty-msg" style="padding:20px">Your mentor hasn\'t added notes yet.</p></div>'}
      `;
    } catch(err) { console.error(err); }
}

// ══════════════════════════════════════════════════════════════
// BOOKING LOGIC
// ══════════════════════════════════════════════════════════════
async function renderBookingSection(container) {
    container.innerHTML = `
      <div class="page-header">
        <div><h1 class="page-title">Book Session</h1><p class="page-subtitle">Schedule your next training.</p></div>
        <button class="btn btn-primary" onclick="openBookingModal()">+ New Booking</button>
      </div>
      <div class="card">
        <div class="card-header"><h3>My Bookings</h3></div>
        <div id="booking-list"><div class="table-loading">Loading...</div></div>
      </div>
    `;
    loadMyBookings();
}

async function loadMyBookings() {
    const uid = currentUser.uid;
    const snap = await db.collection('bookings').where('memberId','==',uid).orderBy('date','desc').get();
    if (snap.empty) {
        document.getElementById('booking-list').innerHTML = '<p class="empty-msg">No bookings found.</p>';
        return;
    }
    const rows = await Promise.all(snap.docs.map(async d => {
        const b = d.data();
        const mDoc = b.mentorId ? await db.collection('users').doc(b.mentorId).get() : null;
        return { ...b, id: d.id, mentorName: mDoc?.exists ? mDoc.data().name : '—' };
    }));
    document.getElementById('booking-list').innerHTML = `
      <table class="data-table">
        <thead><tr><th>Date</th><th>Time</th><th>Mentor</th><th>Type</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>${rows.map(r=>`
          <tr>
            <td>${r.date}</td><td>${r.time||'—'}</td><td>${r.mentorName}</td><td>${r.sessionType||'Personal'}</td>
            <td><span class="badge badge-${r.status==='confirmed'?'success':r.status==='cancelled'?'red':'warning'}">${r.status}</span></td>
            <td>
              ${new Date(r.date) >= new Date() && r.status!=='cancelled' ? `<button class="btn btn-sm btn-outline" onclick="cancelBooking('${r.id}')">Cancel</button>`:'—'}
            </td>
          </tr>`).join('')}
        </tbody>
      </table>`;
}

async function openBookingModal() {
    const sel = document.getElementById('bk-mentor');
    sel.innerHTML = '<option value="">— Loading Mentors —</option>';
    openModal('modal-booking');

    const snap = await db.collection('users').where('role','==','mentor').get();
    sel.innerHTML = '<option value="">— Choose Mentor —</option>' + snap.docs.map(d=>`<option value="${d.id}">${d.data().name}</option>`).join('');

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('bk-date').value = today;
    document.getElementById('bk-date').min = today;
    selectedBookingSlot = null;
    document.getElementById('bk-slots-wrap').style.display = 'none';
}

async function loadBookingSlots() {
    const mId = document.getElementById('bk-mentor').value;
    const date = document.getElementById('bk-date').value;
    if (!mId || !date) return;
    
    selectedBookingSlot = null;
    const wrap = document.getElementById('bk-slots-wrap');
    const sg = document.getElementById('bk-slots');
    wrap.style.display = 'block';
    sg.innerHTML = '<div style="font-size:12px">Loading slots...</div>';

    const snap = await db.collection('bookings').where('mentorId','==',mId).where('date','==',date).get();
    const booked = snap.docs.filter(d=>d.data().status!=='cancelled').map(d=>d.data().time);
    
    const allSlots = ['06:00 AM','07:00 AM','08:00 AM','09:00 AM','10:00 AM','04:00 PM','05:00 PM','06:00 PM','07:00 PM','08:00 PM'];
    sg.innerHTML = allSlots.map(t => {
        const isB = booked.includes(t);
        return `<div class="slot-item ${isB?'booked':''}" onclick="${isB?'':'selectSlot(this,\''+t+'\')'}">${t} ${isB?'(Booked)':''}</div>`;
    }).join('');
}

function selectSlot(el, time) {
    document.querySelectorAll('.slot-item').forEach(e=>e.classList.remove('selected'));
    el.classList.add('selected');
    selectedBookingSlot = time;
}

async function confirmBooking() {
    const mentorId = document.getElementById('bk-mentor').value;
    const date = document.getElementById('bk-date').value;
    const sType = document.getElementById('bk-type').value;

    if (!mentorId || !date || !selectedBookingSlot) { showToast('Please select mentor, date, and a time slot.','warning'); return; }

    try {
        await db.collection('bookings').add({
            memberId: currentUser.uid,
            mentorId: mentorId,
            date: date,
            time: selectedBookingSlot,
            sessionType: sType,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('Booking requested successfully!','success');
        closeModal('modal-booking');
        loadMyBookings();
    } catch(e) { showToast('Error: '+e.message,'error'); }
}

async function cancelBooking(id) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
        await db.collection('bookings').doc(id).update({ status: 'cancelled' });
        showToast('Booking cancelled','success');
        loadMyBookings();
    } catch(e) { showToast('Error: '+e.message,'error'); }
}


// ══════════════════════════════════════════════════════════════
// MEMBER PAYMENTS
// ══════════════════════════════════════════════════════════════
async function renderMemberPayments(container) {
    container.innerHTML = `
      <div class="page-header">
        <div><h1 class="page-title">Payments</h1><p class="page-subtitle">Purchase plans and view history</p></div>
      </div>
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h3>💳 Buy / Renew Plan</h3></div>
          <div id="member-plans-buy"><div class="table-loading">Loading plans...</div></div>
        </div>
        <div class="card">
          <div class="card-header"><h3>📜 Payment History</h3></div>
          <div id="member-payment-history"><div class="table-loading">Loading...</div></div>
        </div>
      </div>
    `;
    await loadPlansForPurchase();
    await loadMemberPaymentHistory();
}

async function loadPlansForPurchase() {
    const snap = await db.collection('plans').orderBy('price').get();
    document.getElementById('member-plans-buy').innerHTML = `
      <div class="plans-list">${snap.docs.map(d => {
        const p = d.data();
        return `<div class="plan-list-item">
          <div class="plan-list-info">
            <div class="plan-list-name">${p.name}</div>
            <div class="plan-list-duration">${p.durationDays} days · ${(p.features||'').split('\n').slice(0,2).join(', ')}</div>
          </div>
          <div class="plan-list-price">${formatINR(p.price)}</div>
          <button class="btn btn-sm btn-primary" onclick="openPayModal('${d.id}','${p.name}',${p.price},${p.durationDays})">Buy</button>
        </div>`;
    }).join('')}
      </div>`;
}

async function loadMemberPaymentHistory() {
    const uid = currentUser.uid;
    const snap = await db.collection('payments').where('memberId','==',uid).orderBy('date','desc').get();
    if (snap.empty) {
        document.getElementById('member-payment-history').innerHTML = '<p class="empty-msg">No payment records yet.</p>';
        return;
    }
    const rows = await Promise.all(snap.docs.map(async d => {
        const p = d.data();
        const planDoc = p.planId ? await db.collection('plans').doc(p.planId).get() : null;
        return { ...p, planName: planDoc?.exists ? planDoc.data().name : '—' };
    }));
    document.getElementById('member-payment-history').innerHTML = `
      <div class="payment-history-list">${rows.map(r=>`
        <div class="payment-hist-item">
          <div class="phi-icon">💳</div>
          <div class="phi-info">
            <div class="phi-plan">${r.planName}</div>
            <div class="phi-date">${formatDate(r.date)} · ${r.method||'UPI'}</div>
          </div>
          <div class="phi-amount text-gold">${formatINR(r.amount)}</div>
          <span class="badge badge-${r.status==='completed'?'success':'warning'}">${r.status}</span>
        </div>`).join('')}
      </div>`;
}

let currentPurchase = null;
function openPayModal(planId, planName, price, days) {
    currentPurchase = { planId, planName, price, days };
    document.getElementById('pay-summary').innerHTML = `
      <div class="pay-sum-card">
        <div class="pay-sum-plan" style="font-weight:700; font-size:18px">${planName}</div>
        <div class="pay-sum-duration" style="color:var(--text-muted); font-size:14px">${days} days membership</div>
        <div class="pay-sum-amount" style="font-size:24px; color:var(--red); font-weight:700; margin-top:8px">${formatINR(price)}</div>
      </div>`;
    toggleUPIField(true);
    openModal('pay-modal');
}

function toggleUPIField(show) {
    document.getElementById('upi-field').style.display = show ? 'block' : 'none';
}

async function processPayment() {
    if (!currentPurchase) return;
    const methodElem = document.querySelector('input[name="pm"]:checked');
    const method = methodElem ? methodElem.value : 'UPI';
    const upiId  = document.getElementById('upi-id')?.value;
    
    if (method === 'UPI' && !upiId) {
        document.getElementById('pay-error').innerText = 'Enter your UPI ID';
        return;
    }
    document.getElementById('pay-error').innerText = '';
  
    document.getElementById('confirm-pay-btn').textContent = 'Processing...';
    document.getElementById('confirm-pay-btn').disabled = true;
  
    // Simulate payment processing delay
    await new Promise(r => setTimeout(r, 1500));
  
    try {
        const uid = currentUser.uid;
        const { planId, price, days } = currentPurchase;
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + days);
  
        const batch = db.batch();
  
        // Record payment
        const payRef = db.collection('payments').doc();
        batch.set(payRef, {
            memberId:  uid,
            planId,
            amount:    price,
            method,
            status:    'completed',
            date:      firebase.firestore.FieldValue.serverTimestamp(),
            txnId:     'TXN' + Math.random().toString(36).slice(2,10).toUpperCase()
        });
  
        // Update member record or create it if missing
        const memberRef = db.collection('members').doc(uid);
        const memberDoc = await memberRef.get();
        
        const updateData = {
            planId,
            status:     'active',
            expiryDate: firebase.firestore.Timestamp.fromDate(expiry),
        };

        if (memberDoc.exists) {
            batch.update(memberRef, updateData);
        } else {
            batch.set(memberRef, { ...updateData, joinDate: firebase.firestore.FieldValue.serverTimestamp() });
        }
  
        await batch.commit();
  
        closeModal('pay-modal');
        showToast('🎉 Payment successful! Membership activated.', 'success');
        document.getElementById('confirm-pay-btn').textContent = 'Pay Now 🔒';
        document.getElementById('confirm-pay-btn').disabled = false;
        await loadMembershipDetail();
        await loadPlansForPurchase();
        await loadMemberPaymentHistory();
  
    } catch(err) {
        showToast('Payment failed: '+err.message, 'error');
        document.getElementById('confirm-pay-btn').textContent = 'Pay Now 🔒';
        document.getElementById('confirm-pay-btn').disabled = false;
    }
}


// ══════════════════════════════════════════════════════════════
// PROGRESS
// ══════════════════════════════════════════════════════════════
async function renderMemberProgress(container) {
    const uid = currentUser.uid;
    container.innerHTML = `
      <div class="page-header"><div><h1 class="page-title">My Progress</h1><p class="page-subtitle">Track your fitness journey</p></div></div>
      <div id="progress-content"><div class="table-loading">Loading...</div></div>
    `;
    try {
        const [notesDoc, bookingsSnap] = await Promise.all([
            db.collection('memberNotes').doc(uid).get(),
            db.collection('bookings').where('memberId','==',uid).where('status','==','confirmed').get()
        ]);
        const notes = notesDoc.exists ? notesDoc.data() : {};
  
        // Sessions by month
        const months = [];
        const sessionByMonth = {};
        for (let i=4;i>=0;i--) {
            const d=new Date(); d.setMonth(d.getMonth()-i);
            const k=d.toLocaleDateString('en-IN',{month:'short',year:'2-digit'});
            months.push(k); sessionByMonth[k]=0;
        }
        bookingsSnap.docs.forEach(d => {
            const dt = new Date(d.data().date);
            const k  = dt.toLocaleDateString('en-IN',{month:'short',year:'2-digit'});
            if (sessionByMonth[k]!==undefined) sessionByMonth[k]++;
        });
  
        document.getElementById('progress-content').innerHTML = `
        <div class="grid-2">
          <div class="card">
            <div class="card-header"><h3>📊 Session Attendance</h3></div>
            <canvas id="session-chart" height="200"></canvas>
          </div>
          <div class="card">
            <div class="card-header"><h3>🏆 Stats</h3></div>
            <div class="progress-stats">
              <div class="ps-item"><div class="ps-val">${bookingsSnap.size}</div><div class="ps-label">Confirmed Sessions</div></div>
            </div>
          </div>
        </div>
        ${notes.progress ? `
        <div class="card mt-20">
          <div class="card-header"><h3>📝 Mentor's Progress Notes</h3></div>
          <pre class="workout-text" style="margin:16px">${notes.progress}</pre>
        </div>` : ''}
      `;
  
        new Chart(document.getElementById('session-chart'), {
            type: 'bar',
            data: {
                labels: months,
                datasets: [{ label: 'Sessions Attended', data: months.map(m=>sessionByMonth[m]),
                backgroundColor: 'rgba(232,0,61,0.7)', borderColor:'#E8003D', borderWidth:2, borderRadius:6
                }]
            },
            options: {
                responsive:true,
                plugins:{legend:{labels:{color:'#ccc'}}},
                scales:{
                    x:{ticks:{color:'#777'},grid:{color:'rgba(255,255,255,0.05)'}},
                    y:{ticks:{color:'#777',stepSize:1},grid:{color:'rgba(255,255,255,0.05)'}}
                }
            }
        });
    } catch(err) { console.error(err); }
}

// ── PROFILE PAGE ─────────────────────────────────────────────
async function renderProfilePage() {
    const p = currentProfile;
    const content = document.getElementById('main-content');
    content.innerHTML = `
      <div class="page-header"><h1>My Profile</h1><p>Manage your account information</p></div>
      <div style="max-width:600px">
        <div class="card">
          <div class="card-header"><div class="card-title">Profile Information</div></div>
          <div style="display:flex;align-items:center;gap:20px;margin-bottom:28px">
            <div class="avatar avatar-xl" id="profile-avatar-display" style="font-size:32px">
              ${p.profileImage ? `<img src="${p.profileImage}" alt="">` : (p.name||'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 style="font-size:22px;margin-bottom:4px">${p.name||''}</h3>
              <div class="badge badge-green">${(p.role||'member').toUpperCase()}</div>
              <p style="font-size:13px;color:var(--text-muted);margin-top:6px">Member Account</p>
            </div>
          </div>
          <div class="form-group"><label class="form-label">Full Name</label><input type="text" id="prof-name" class="form-control" value="${p.name||''}"></div>
          <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-control" value="${p.email||''}" disabled></div>
          <div class="form-group"><label class="form-label">Phone</label><input type="tel" id="prof-phone" class="form-control" value="${p.phone||''}"></div>
          <button class="btn btn-primary" onclick="saveProfile()"><span class="btn-text">Save Changes</span></button>
        </div>
      </div>`;
}

async function saveProfile() {
    const name  = document.getElementById('prof-name').value.trim();
    const phone = document.getElementById('prof-phone').value.trim();
  
    if (!name) { showToast('Name cannot be empty', 'warning'); return; }
  
    try {
      await db.collection('users').doc(currentUser.uid).update({ name, phone });
      await currentUser.updateProfile({ displayName: name });
      currentProfile.name = name; currentProfile.phone = phone;
      setupSidebarUser();
      showToast('Profile updated!', 'success');
    } catch (e) { showToast('Error saving profile: ' + e.message, 'error'); }
}
