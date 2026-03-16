// ============================================================
// MENTOR.JS — Mentor Dashboard Logic
// ============================================================

let currentUser = null;
let currentProfile = null;
let currentPage = 'home';
let myStudents = [];

// ── INIT ─────────────────────────────────────────────────────
firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        try {
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) {
                currentProfile = doc.data();
                if (currentProfile.role !== 'mentor') {
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
    document.getElementById('user-name-sidebar').textContent = p.name || 'Mentor';
    const av = document.getElementById('user-avatar-sidebar');
    if (p.profileImage) {
        av.innerHTML = `<img src="${p.profileImage}" alt="">`;
    } else {
        av.textContent = (p.name || 'M').charAt(0).toUpperCase();
    }
}

// ── PAGE ROUTING ─────────────────────────────────────────────
async function loadPage(pageId) {
    currentPage = pageId;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navEl = document.getElementById(`nav-${pageId}`);
    if (navEl) navEl.classList.add('active');

    const titles = {
        home: 'Dashboard', students: 'My Students', schedule: 'My Schedule', profile: 'Profile'
    };
    document.getElementById('topbar-title').textContent = titles[pageId] || 'Dashboard';
    document.getElementById('topbar-breadcrumb').textContent = `IronForge › ${titles[pageId] || ''}`;

    const content = document.getElementById('main-content');
    content.innerHTML = `<div class="empty-state"><div class="empty-icon" style="animation:spin 1s linear infinite">⚙️</div><h3>Loading...</h3></div>`;

    switch(pageId) {
        case 'home':      await renderMentorDashboard(content); break;
        case 'students':  await renderMyStudentsPage(content); break;
        case 'schedule':  await renderMySchedulePage(content); break;
        case 'profile':   await renderProfilePage(content); break;
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
// MENTOR DASHBOARD
// ══════════════════════════════════════════════════════════════
async function renderMentorDashboard(container) {
    container.innerHTML = `
      <div class="page-header">
        <div><h1 class="page-title">Mentor Dashboard</h1><p class="page-subtitle">Welcome back, ${currentProfile?.name}</p></div>
        <div class="header-date">${new Date().toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
      </div>
      <div class="stats-grid" id="mentor-stats">
        ${['My Students','Today Sessions','Pending Requests','Completed (Month)'].map(t=>`
          <div class="stat-card skeleton"><div class="stat-label">${t}</div><div class="stat-value">—</div></div>`).join('')}
      </div>
      <div class="grid-2 mt-20">
        <div class="card"><div class="card-header"><h3>Today's Schedule</h3></div><div id="mentor-today-schedule"><div class="table-loading">Loading...</div></div></div>
        <div class="card"><div class="card-header"><h3>Recent Students</h3></div><div id="mentor-recent-students"><div class="table-loading">Loading...</div></div></div>
      </div>
    `;
    await Promise.all([ loadMentorStats(), loadMentorTodaySchedule(), loadRecentStudents() ]);
}

async function loadMentorStats() {
    const uid = currentUser.uid;
    try {
        const [memSnap, bSnap] = await Promise.all([
            db.collection('members').where('mentorId','==',uid).get(),
            db.collection('bookings').where('mentorId','==',uid).get()
        ]);
        
        const today = new Date().toISOString().split('T')[0];
        let todayCount = 0; let pendingCount = 0; let monthCount = 0;
        
        const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0);

        bSnap.docs.forEach(d => {
            const b = d.data();
            if (b.date === today && b.status !== 'cancelled') todayCount++;
            if (b.status === 'pending') pendingCount++;
            if (b.status === 'completed' && new Date(b.date) >= startOfMonth) monthCount++;
        });

        document.getElementById('mentor-stats').innerHTML = `
          <div class="stat-card stat-blue"><div class="stat-icon">👥</div><div class="stat-info"><div class="stat-label">My Students</div><div class="stat-value">${memSnap.size}</div></div></div>
          <div class="stat-card stat-gold"><div class="stat-icon">📅</div><div class="stat-info"><div class="stat-label">Today's Sessions</div><div class="stat-value">${todayCount}</div></div></div>
          <div class="stat-card stat-${pendingCount>0?'red':'green'}"><div class="stat-icon">🔔</div><div class="stat-info"><div class="stat-label">Pending Requests</div><div class="stat-value">${pendingCount}</div></div></div>
          <div class="stat-card stat-purple"><div class="stat-icon">✔️</div><div class="stat-info"><div class="stat-label">Completed (Month)</div><div class="stat-value">${monthCount}</div></div></div>
        `;
    } catch(err) { console.error(err); }
}

async function loadMentorTodaySchedule() {
    const uid = currentUser.uid;
    const today = new Date().toISOString().split('T')[0];
    try {
        const snap = await db.collection('bookings').where('mentorId','==',uid).where('date','==',today).get();
        if(snap.empty) { document.getElementById('mentor-today-schedule').innerHTML='<p class="empty-msg">No sessions today</p>'; return; }
        
        const rows = await Promise.all(snap.docs.map(async d => {
            const b = d.data();
            const uDoc = b.memberId ? await db.collection('users').doc(b.memberId).get() : null;
            return { ...b, id: d.id, memberName: uDoc?.exists ? uDoc.data().name : 'Unknown' };
        }));
        // Sort by time
        rows.sort((a,b) => {
            const ta = a.time||'99:99'; const tb = b.time||'99:99';
            return ta.localeCompare(tb);
        });

        document.getElementById('mentor-today-schedule').innerHTML = `
          <div class="session-list">${rows.map(r=>`
            <div class="session-item">
              <div class="session-time">${r.time}</div>
              <div class="session-info"><div class="session-member">${r.memberName}</div><div class="session-type">${r.sessionType}</div></div>
              <span class="badge badge-${r.status==='confirmed'?'success':r.status==='pending'?'warning':'red'}">${r.status}</span>
            </div>`).join('')}
          </div>`;
    } catch(e) { console.error(e); }
}

async function loadRecentStudents() {
    try {
        await fetchMyStudentsList();
        const recent = myStudents.slice(0,5);
        if(!recent.length) { document.getElementById('mentor-recent-students').innerHTML='<p class="empty-msg">No students assigned</p>'; return; }
        document.getElementById('mentor-recent-students').innerHTML = `
          <div class="session-list">${recent.map(s=>`
            <div class="session-item" style="cursor:pointer" onclick="openStudentModal('${s.id}')">
              <div class="avatar avatar-sm">${s.name[0].toUpperCase()}</div>
              <div class="session-info"><div class="session-member">${s.name}</div><div class="session-type">${s.phone}</div></div>
              <span class="badge badge-${s.status==='active'?'success':'inactive'}">${s.status}</span>
            </div>`).join('')}</div>
        `;
    } catch(err) { console.error(err); }
}

// ══════════════════════════════════════════════════════════════
// MY STUDENTS PAGE
// ══════════════════════════════════════════════════════════════
async function renderMyStudentsPage(container) {
    container.innerHTML = `
      <div class="page-header">
        <div><h1 class="page-title">My Students</h1><p class="page-subtitle">Track progress and assign workouts</p></div>
      </div>
      <div class="card">
        <div class="table-actions">
          <input type="text" id="search-students" class="form-control" style="max-width:300px" placeholder="Search students..." onkeyup="filterStudents()">
        </div>
        <div id="students-table"><div class="table-loading">Loading students...</div></div>
      </div>
    `;
    await fetchMyStudentsList();
    renderStudentsTable(myStudents);
}

async function fetchMyStudentsList() {
    const uid = currentUser.uid;
    const memSnap = await db.collection('members').where('mentorId','==',uid).get();
    const infoMap = {}; memSnap.forEach(d=>infoMap[d.id] = d.data());
    
    const uids = Object.keys(infoMap);
    if (!uids.length) { myStudents = []; return; }

    const uSnap = await db.collection('users').where(firebase.firestore.FieldPath.documentId(), 'in', uids).get();
    myStudents = uSnap.docs.map(d => {
        const u = d.data(); const i = infoMap[d.id];
        return { id: d.id, name: u.name, email: u.email, phone: u.phone, status: i.status||'inactive' };
    });
}

function renderStudentsTable(list) {
    if (!list.length) { document.getElementById('students-table').innerHTML = '<p class="empty-msg">No students assigned to you.</p>'; return; }
    document.getElementById('students-table').innerHTML = `
      <table class="data-table">
        <thead><tr><th>Name</th><th>Contact</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${list.map(s=>`
          <tr>
            <td><strong>${s.name}</strong></td>
            <td>${s.phone}<br><span style="font-size:11px;color:var(--text-muted)">${s.email}</span></td>
            <td><span class="badge badge-${s.status==='active'?'success':'inactive'}">${s.status}</span></td>
            <td>
              <button class="btn btn-sm btn-primary" onclick="openStudentModal('${s.id}')">Manage Plan</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>`;
}

function filterStudents() {
    const q = document.getElementById('search-students').value.toLowerCase();
    renderStudentsTable(myStudents.filter(s => String(s.name).toLowerCase().includes(q) || String(s.phone).includes(q) || String(s.email).toLowerCase().includes(q)));
}

async function openStudentModal(id) {
    const student = myStudents.find(s=>s.id === id);
    if(!student) return;
    
    document.getElementById('sm-title').textContent = `Manage: ${student.name}`;
    document.getElementById('student-id-hidden').value = id;
    
    document.getElementById('sm-workout').value = 'Loading...';
    document.getElementById('sm-diet').value = 'Loading...';
    document.getElementById('sm-progress').value = 'Loading...';
    
    openModal('modal-student-plan');

    try {
        const doc = await db.collection('memberNotes').doc(id).get();
        if(doc.exists) {
            const data = doc.data();
            document.getElementById('sm-workout').value = data.workout || '';
            document.getElementById('sm-diet').value = data.diet || '';
            document.getElementById('sm-progress').value = data.progress || '';
        } else {
            document.getElementById('sm-workout').value = '';
            document.getElementById('sm-diet').value = '';
            document.getElementById('sm-progress').value = '';
        }
    } catch(err) { console.error(err); }
}

async function saveStudentPlan() {
    const id = document.getElementById('student-id-hidden').value;
    const workout = document.getElementById('sm-workout').value;
    const diet = document.getElementById('sm-diet').value;
    const progress = document.getElementById('sm-progress').value;

    const btn = document.getElementById('save-plan-btn');
    btn.textContent = 'Saving...'; btn.disabled = true;

    try {
        await db.collection('memberNotes').doc(id).set({ workout, diet, progress, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, {merge:true});
        showToast('Plan saved successfully!', 'success');
        closeModal('modal-student-plan');
    } catch(err) {
        showToast('Error saving plan: '+err.message, 'error');
    } finally {
        btn.textContent = 'Save Plan'; btn.disabled = false;
    }
}


// ══════════════════════════════════════════════════════════════
// MY SCHEDULE (Bookings)
// ══════════════════════════════════════════════════════════════
async function renderMySchedulePage(container) {
    container.innerHTML = `
      <div class="page-header"><div><h1 class="page-title">My Schedule</h1><p class="page-subtitle">Manage session bookings</p></div></div>
      <div class="card"><div id="schedule-table"><div class="table-loading">Loading schedule...</div></div></div>
    `;
    await loadMentorScheduleTable();
}

async function loadMentorScheduleTable() {
    const uid = currentUser.uid;
    try {
        const snap = await db.collection('bookings').where('mentorId','==',uid).orderBy('date','desc').get();
        if(snap.empty) { document.getElementById('schedule-table').innerHTML='<p class="empty-msg">No bookings</p>'; return; }
        
        const rows = await Promise.all(snap.docs.map(async d => {
            const b = d.data();
            const uDoc = b.memberId ? await db.collection('users').doc(b.memberId).get() : null;
            return { ...b, id: d.id, memberName: uDoc?.exists ? uDoc.data().name : 'Unknown' };
        }));

        document.getElementById('schedule-table').innerHTML = `
          <table class="data-table">
            <thead><tr><th>Date & Time</th><th>Member</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>${rows.map(r=>`
              <tr>
                <td><strong>${formatDate(r.date)}</strong><br><span style="font-size:12px;color:var(--text-muted)">${r.time}</span></td>
                <td>${r.memberName}</td>
                <td>${r.sessionType}</td>
                <td><span class="badge badge-${r.status==='confirmed'?'success':r.status==='pending'?'warning':r.status==='completed'?'blue':'red'}">${r.status.toUpperCase()}</span></td>
                <td>
                  ${r.status==='pending'?`<button class="btn btn-sm btn-success" onclick="updateBooking('${r.id}','confirmed')">Accept</button>`:''}
                  ${r.status==='confirmed' && new Date(r.date)<=new Date()?`<button class="btn btn-sm btn-blue" onclick="updateBooking('${r.id}','completed')">Mark Done</button>`:''}
                  ${(r.status==='pending' || r.status==='confirmed')?`<button class="btn btn-sm btn-outline text-danger" onclick="updateBooking('${r.id}','cancelled')">Cancel</button>`:''}
                </td>
              </tr>`).join('')}
            </tbody>
          </table>`;
    } catch(e) { console.error(e); }
}

async function updateBooking(id, status) {
    if(status==='cancelled' && !confirm('Cancel this session?')) return;
    try {
        await db.collection('bookings').doc(id).update({ status });
        showToast('Session updated to '+status,'success');
        if(currentPage==='schedule') loadMentorScheduleTable();
        else renderMentorDashboard(document.getElementById('main-content'));
    } catch(err) { showToast(err.message,'error'); }
}

// ── PROFILE PAGE ─────────────────────────────────────────────
async function renderProfilePage(container) {
    const p = currentProfile;
    container.innerHTML = `
      <div class="page-header"><h1>My Profile</h1><p>Manage your account information</p></div>
      <div style="max-width:600px">
        <div class="card">
          <div class="card-header"><div class="card-title">Profile Information</div></div>
          <div style="display:flex;align-items:center;gap:20px;margin-bottom:28px">
            <div class="avatar avatar-xl" id="profile-avatar-display" style="font-size:32px">
              ${p.profileImage ? `<img src="${p.profileImage}" alt="">` : (p.name||'M').charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 style="font-size:22px;margin-bottom:4px">${p.name||'Mentor'}</h3>
              <div class="badge badge-gold">MENTOR</div>
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
