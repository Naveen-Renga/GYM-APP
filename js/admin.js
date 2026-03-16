// ============================================================
// ADMIN.JS — Admin Dashboard Logic
// ============================================================

let currentUser = null;
let currentProfile = null;
let currentPage = 'home';
let membersList = [];
let mentorsList = [];
let plansList = [];

// ── INIT ─────────────────────────────────────────────────────
firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        try {
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) {
                currentProfile = doc.data();
                if (currentProfile.role !== 'admin') {
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
    document.getElementById('user-name-sidebar').textContent = p.name || 'Admin';
    const av = document.getElementById('user-avatar-sidebar');
    if (p.profileImage) {
        av.innerHTML = `<img src="${p.profileImage}" alt="">`;
    } else {
        av.textContent = (p.name || 'A').charAt(0).toUpperCase();
    }
}

// ── PAGE ROUTING ─────────────────────────────────────────────
async function loadPage(pageId) {
    currentPage = pageId;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navEl = document.getElementById(`nav-${pageId}`);
    if (navEl) navEl.classList.add('active');

    const titles = {
        home: 'Dashboard', members: 'Members', mentors: 'Mentors', plans: 'Plans',
        bookings: 'Bookings', payments: 'Payments', analytics: 'Analytics', profile: 'Profile'
    };
    document.getElementById('topbar-title').textContent = titles[pageId] || 'Dashboard';
    document.getElementById('topbar-breadcrumb').textContent = `IronForge › ${titles[pageId] || ''}`;

    const content = document.getElementById('main-content');
    content.innerHTML = `<div class="empty-state"><div class="empty-icon" style="animation:spin 1s linear infinite">⚙️</div><h3>Loading...</h3></div>`;

    switch(pageId) {
        case 'home':      await renderAdminDashboard(content); break;
        case 'members':   await renderMembersPage(content); break;
        case 'mentors':   await renderMentorsPage(content); break;
        case 'plans':     await renderPlansPage(content); break;
        case 'bookings':  await renderBookingsPage(content); break;
        case 'payments':  await renderPaymentsPage(content); break;
        case 'analytics': await renderAnalyticsPage(content); break;
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
// ADMIN DASHBOARD
// ══════════════════════════════════════════════════════════════
async function renderAdminDashboard(container) {
    container.innerHTML = `
      <div class="page-header">
        <div><h1 class="page-title">Admin Dashboard</h1><p class="page-subtitle">Overview of IronForge Gym</p></div>
        <div class="header-date">${new Date().toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
      </div>
      <div class="stats-grid" id="admin-stats">
        ${['Total Members','Active Members','Mentors','Revenue (Monthly)'].map(t=>`
          <div class="stat-card skeleton"><div class="stat-label">${t}</div><div class="stat-value">—</div></div>`).join('')}
      </div>
      <div class="grid-2 mt-20">
        <div class="card"><div class="card-header"><h3>Revenue Trend</h3></div><canvas id="rev-chart" height="200"></canvas></div>
        <div class="card"><div class="card-header"><h3>Recent Activity</h3></div><div id="recent-activity"><div class="table-loading">Loading...</div></div></div>
      </div>
    `;
    await Promise.all([ loadAdminStats(), loadDashboardCharts(), loadRecentActivity() ]);
}

async function loadAdminStats() {
    try {
        const [memSnap, mInfoSnap, mentSnap, paySnap] = await Promise.all([
            db.collection('users').where('role','==','member').get(),
            db.collection('members').where('status','==','active').get(),
            db.collection('users').where('role','==','mentor').get(),
            db.collection('payments').where('status','==','completed').get()
        ]);
        
        let monthRev = 0;
        const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0);
        paySnap.docs.forEach(d => {
            const p = d.data();
            if (new Date(p.date?.toDate?p.date.toDate():p.date) >= startOfMonth) monthRev += Number(p.amount);
        });

        document.getElementById('admin-stats').innerHTML = `
          <div class="stat-card stat-blue"><div class="stat-icon">👥</div><div class="stat-info"><div class="stat-label">Total Members</div><div class="stat-value">${memSnap.size}</div></div></div>
          <div class="stat-card stat-green"><div class="stat-icon">✅</div><div class="stat-info"><div class="stat-label">Active Members</div><div class="stat-value">${mInfoSnap.size}</div></div></div>
          <div class="stat-card stat-gold"><div class="stat-icon">🏅</div><div class="stat-info"><div class="stat-label">Mentors</div><div class="stat-value">${mentSnap.size}</div></div></div>
          <div class="stat-card stat-red"><div class="stat-icon">₹</div><div class="stat-info"><div class="stat-label">Revenue (Month)</div><div class="stat-value">${formatINR(monthRev)}</div></div></div>
        `;
    } catch(err) { console.error(err); }
}

async function loadDashboardCharts() {
    const ctx = document.getElementById('rev-chart');
    if (!ctx) return;
    new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['Jan','Feb','Mar','Apr','May','Jun'],
          datasets: [{ label:'Revenue', data:[12000,19000,15000,22000,28000,34000], borderColor:'#00F5A0', backgroundColor:'rgba(0,245,160,0.1)', tension:0.4, fill:true }]
        },
        options: { responsive:true, plugins:{legend:{display:false}}, scales:{x:{grid:{color:'rgba(255,255,255,0.05)'}},y:{grid:{color:'rgba(255,255,255,0.05)'}}} }
    });
}

async function loadRecentActivity() {
    try {
        const snap = await db.collection('bookings').orderBy('createdAt','desc').limit(5).get();
        if (snap.empty) {
            document.getElementById('recent-activity').innerHTML = '<p class="empty-msg">No recent activity.</p>'; return;
        }
        document.getElementById('recent-activity').innerHTML = `
          <div class="session-list">${snap.docs.map(d=> {
            const b = d.data();
            return `<div class="session-item">
              <div class="session-time">${formatDate(b.createdAt)}</div>
              <div class="session-info"><div class="session-member">New Booking</div><div class="session-type">${b.sessionType} · ${b.date}</div></div>
              <span class="badge badge-warning">Pending</span>
            </div>`;
          }).join('')}</div>`;
    } catch(err) { console.error(err); }
}

// ══════════════════════════════════════════════════════════════
// MEMBERS PAGE
// ══════════════════════════════════════════════════════════════
async function renderMembersPage(container) {
    container.innerHTML = `
      <div class="page-header">
        <div><h1 class="page-title">Members</h1><p class="page-subtitle">Manage gym members</p></div>
        <button class="btn btn-primary" onclick="openModal('modal-add-member')">+ Add Member</button>
      </div>
      <div class="card">
        <div class="table-actions">
          <input type="text" id="search-members" class="form-control" style="max-width:300px" placeholder="Search members..." onkeyup="filterMembers()">
        </div>
        <div id="members-table"><div class="table-loading">Loading members...</div></div>
      </div>
    `;

    // Fetch plans and mentors for the dropdowns
    const [pSnap, mSnap] = await Promise.all([ db.collection('plans').get(), db.collection('users').where('role','==','mentor').get() ]);
    let pOpts = '<option value="">— Select Plan —</option>';
    pSnap.forEach(doc => pOpts += `<option value="${doc.id}">${doc.data().name} — ${formatINR(doc.data().price)}</option>`);
    document.getElementById('am-plan').innerHTML = pOpts;

    let mOpts = '<option value="">— Select Mentor —</option>';
    mSnap.forEach(doc => mOpts += `<option value="${doc.id}">${doc.data().name}</option>`);
    document.getElementById('am-mentor').innerHTML = mOpts;

    await fetchAndRenderMembers();
}

async function fetchAndRenderMembers() {
    try {
        const uSnap = await db.collection('users').where('role','==','member').get();
        const infoSnap = await db.collection('members').get();
        const pSnap = await db.collection('plans').get();
        const mentSnap = await db.collection('users').where('role','==','mentor').get();

        const infoMap = {}; infoSnap.forEach(d => infoMap[d.id] = d.data());
        const planMap = {}; pSnap.forEach(d => planMap[d.id] = d.data());
        const mentMap = {}; mentSnap.forEach(d => mentMap[d.id] = d.data());

        membersList = uSnap.docs.map(d => {
            const u = d.data(); const i = infoMap[d.id] || {};
            const p = planMap[i.planId] || {}; const mn = mentMap[i.mentorId] || {};
            return {
                id: d.id, name: u.name, phone: u.phone, email: u.email,
                plan: p.name || 'None', mentor: mn.name || 'Unassigned',
                status: i.status || 'inactive', expiry: i.expiryDate
            };
        });
        renderMembersTable(membersList);
    } catch(err) { console.error(err); }
}

function renderMembersTable(list) {
    if (!list.length) { document.getElementById('members-table').innerHTML = '<p class="empty-msg">No members found.</p>'; return; }
    document.getElementById('members-table').innerHTML = `
      <table class="data-table">
        <thead><tr><th>Name</th><th>Contact</th><th>Plan</th><th>Mentor</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${list.map(m=>`
          <tr>
            <td><strong>${m.name}</strong></td>
            <td>${m.phone}<br><span style="font-size:11px;color:var(--text-muted)">${m.email}</span></td>
            <td>${m.plan}</td><td>${m.mentor}</td>
            <td><span class="badge badge-${m.status==='active'?'success':'inactive'}">${m.status}</span></td>
            <td>
              <button class="btn btn-sm btn-outline text-danger" onclick="deleteMember('${m.id}')">Remove</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>`;
}

function filterMembers() {
    const q = document.getElementById('search-members').value.toLowerCase();
    renderMembersTable(membersList.filter(m => String(m.name).toLowerCase().includes(q) || String(m.phone).includes(q) || String(m.email).toLowerCase().includes(q)));
}

async function addMember() {
    const name = document.getElementById('am-name').value;
    const phone = document.getElementById('am-phone').value;
    const email = document.getElementById('am-email').value;
    const pwd = document.getElementById('am-password').value;
    const planId = document.getElementById('am-plan').value;
    const mentorId = document.getElementById('am-mentor').value;

    if (!name || !email || !pwd) { showToast('Name, Email, and Password required','warning'); return; }

    showToast('Creating member...', 'info');
    try {
        const newUserRef = db.collection('users').doc();
        let planData = null;
        if(planId) {
            const pDoc = await db.collection('plans').doc(planId).get();
            planData = pDoc.data();
        }

        const expiry = new Date();
        if(planData && planData.durationDays) expiry.setDate(expiry.getDate() + Number(planData.durationDays));

        await newUserRef.set({ name, email, phone, role: 'member', createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        await db.collection('members').doc(newUserRef.id).set({
            planId: planId || null,
            mentorId: mentorId || null,
            joinDate: firebase.firestore.FieldValue.serverTimestamp(),
            expiryDate: planId ? firebase.firestore.Timestamp.fromDate(expiry) : null,
            status: planId ? 'active' : 'inactive'
        });

        showToast('Member created successfully! (Simulated auth generation for Demo)','success');
        closeModal('modal-add-member');
        Object.keys(document.querySelectorAll('#modal-add-member input')).forEach(k=>document.querySelectorAll('#modal-add-member input')[k].value='');
        fetchAndRenderMembers();
    } catch(err) { showToast('Error: '+err.message, 'error'); }
}

async function deleteMember(uid) {
    if (!confirm('Remove this member completely?')) return;
    try {
        await db.collection('users').doc(uid).delete();
        await db.collection('members').doc(uid).delete();
        showToast('Member removed','success');
        fetchAndRenderMembers();
    } catch(err) { showToast('Error: '+err.message,'error'); }
}


// ══════════════════════════════════════════════════════════════
// MENTORS PAGE
// ══════════════════════════════════════════════════════════════
async function renderMentorsPage(container) {
    container.innerHTML = `
      <div class="page-header">
        <div><h1 class="page-title">Mentors</h1><p class="page-subtitle">Manage trainers</p></div>
        <button class="btn btn-primary" onclick="openModal('modal-add-mentor')">+ Add Mentor</button>
      </div>
      <div class="card" id="mentors-list"><div class="table-loading">Loading mentors...</div></div>
    `;
    await fetchAndRenderMentors();
}

async function fetchAndRenderMentors() {
    try {
        const uSnap = await db.collection('users').where('role','==','mentor').get();
        // Get student counts
        const cnts = {};
        const memSnap = await db.collection('members').get();
        memSnap.forEach(d => {
            const m = d.data();
            if (m.mentorId) cnts[m.mentorId] = (cnts[m.mentorId]||0)+1;
        });

        mentorsList = uSnap.docs.map(d => {
            const u = d.data();
            return { id: d.id, name: u.name, phone: u.phone, email: u.email, spec: u.specialization||'General', students: cnts[d.id]||0 };
        });

        if (!mentorsList.length) { document.getElementById('mentors-list').innerHTML = '<p class="empty-msg">No mentors found.</p>'; return; }
        
        document.getElementById('mentors-list').innerHTML = `
          <div class="grid-3" style="padding:20px;gap:20px">${mentorsList.map(m=>`
            <div class="card" style="margin:0">
              <div style="display:flex;gap:15px;align-items:center;margin-bottom:15px">
                <div class="avatar avatar-md">${m.name[0].toUpperCase()}</div>
                <div><h3 style="font-size:16px;margin:0">${m.name}</h3><span class="badge badge-gold" style="font-size:10px">${m.spec}</span></div>
              </div>
              <div style="font-size:13px;color:var(--text-muted);margin-bottom:15px">
                <div>📧 ${m.email}</div><div>📱 ${m.phone}</div>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--border);padding-top:15px">
                <div style="font-size:12px"><strong>${m.students}</strong> active students</div>
                <button class="btn btn-sm btn-outline text-danger" onclick="deleteMentor('${m.id}')">Remove</button>
              </div>
            </div>`).join('')}
          </div>`;
    } catch(err) { console.error(err); }
}

async function addMentor() {
    const name = document.getElementById('men-name').value;
    const phone = document.getElementById('men-phone').value;
    const email = document.getElementById('men-email').value;
    const pwd = document.getElementById('men-password').value;
    const spec = document.getElementById('men-spec').value;

    if (!name || !email || !pwd) { showToast('Name, Email, and Password required','warning'); return; }

    try {
        const newUserRef = db.collection('users').doc();
        await newUserRef.set({ name, email, phone, specialization: spec, role: 'mentor', createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        showToast('Mentor added!','success');
        closeModal('modal-add-mentor');
        fetchAndRenderMentors();
    } catch(err) { showToast('Error: '+err.message, 'error'); }
}

async function deleteMentor(uid) {
    if (!confirm('Remove this mentor completely?')) return;
    try {
        await db.collection('users').doc(uid).delete();
        showToast('Mentor removed','success');
        fetchAndRenderMentors();
    } catch(err) { showToast('Error: '+err.message,'error'); }
}

// ══════════════════════════════════════════════════════════════
// PLANS PAGE
// ══════════════════════════════════════════════════════════════
async function renderPlansPage(container) {
    container.innerHTML = `
      <div class="page-header">
        <div><h1 class="page-title">Membership Plans</h1><p class="page-subtitle">Configure pricing</p></div>
        <button class="btn btn-primary" onclick="openModal('modal-add-plan')">+ Create Plan</button>
      </div>
      <div id="plans-grid" class="grid-3"></div>
    `;
    await fetchAndRenderPlans();
}

async function fetchAndRenderPlans() {
    try {
        const snap = await db.collection('plans').orderBy('price').get();
        if (snap.empty) { document.getElementById('plans-grid').innerHTML = '<p class="empty-msg" style="grid-column:1/-1">No plans configured.</p>'; return; }
        
        document.getElementById('plans-grid').innerHTML = snap.docs.map(d=> {
            const p = d.data();
            const feats = (p.features||'').split('\n').filter(x=>x);
            return `
              <div class="plan-card ${p.isPopular?'plan-featured':''}">
                ${p.isPopular?'<div class="plan-badge">Popular</div>':''}
                <div class="plan-name">${p.name}</div>
                <div class="plan-price"><span class="plan-currency">₹</span>${p.price}<span class="plan-period">/${p.durationDays} days</span></div>
                <ul class="plan-features" style="height:120px;overflow-y:auto;text-align:left;font-size:13px;padding-left:15px;margin:20px 0">
                  ${feats.map(f=>`<li style="margin-bottom:8px">${f}</li>`).join('')}
                </ul>
                <button class="btn btn-outline text-danger w-full" onclick="deletePlan('${d.id}')">Delete Plan</button>
              </div>`;
        }).join('');
    } catch(err) { console.error(err); }
}

async function savePlan() {
    const name = document.getElementById('pl-name').value;
    const price = Number(document.getElementById('pl-price').value);
    const durationDays = Number(document.getElementById('pl-days').value);
    const features = document.getElementById('pl-features').value;
    const isPopular = document.getElementById('pl-popular').value === 'true';

    if (!name || !price || !durationDays) { showToast('Name, price and duration required','warning'); return; }

    try {
        await db.collection('plans').add({ name, price, durationDays, features, isPopular });
        showToast('Plan created!','success');
        closeModal('modal-add-plan');
        fetchAndRenderPlans();
    } catch(err) { showToast('Error: '+err.message,'error'); }
}

async function deletePlan(id) {
    if(!confirm('Delete this plan?')) return;
    try { await db.collection('plans').doc(id).delete(); fetchAndRenderPlans(); }
    catch(err) { showToast(err.message,'error'); }
}


// ══════════════════════════════════════════════════════════════
// ANALYTICS, BOOKINGS, PAYMENTS
// ══════════════════════════════════════════════════════════════
async function renderBookingsPage(container) {
    container.innerHTML = `
      <div class="page-header"><div><h1 class="page-title">All Bookings</h1><p class="page-subtitle">System-wide booking list</p></div></div>
      <div class="card"><div id="bookings-table"><div class="table-loading">Loading...</div></div></div>`;
    
    try {
        const [bSnap, uSnap] = await Promise.all([ db.collection('bookings').orderBy('date','desc').get(), db.collection('users').get() ]);
        const uMap = {}; uSnap.forEach(d=>uMap[d.id]=d.data().name);
        
        if(bSnap.empty) { document.getElementById('bookings-table').innerHTML='<p class="empty-msg">No Bookings</p>'; return; }
        document.getElementById('bookings-table').innerHTML = `
          <table class="data-table">
            <thead><tr><th>Date & Time</th><th>Member</th><th>Mentor</th><th>Type</th><th>Status</th></tr></thead>
            <tbody>${bSnap.docs.map(d=>{
                const b=d.data();
                return `<tr>
                  <td>${b.date} · ${b.time}</td>
                  <td>${uMap[b.memberId]||'Unknown'}</td>
                  <td>${uMap[b.mentorId]||'Unknown'}</td>
                  <td>${b.sessionType}</td>
                  <td><span class="badge badge-${b.status==='confirmed'?'success':b.status==='cancelled'?'red':'warning'}">${b.status}</span></td>
                </tr>`;
            }).join('')}</tbody>
          </table>`;
    } catch(e) { console.error(e); }
}

async function renderPaymentsPage(container) {
    container.innerHTML = `
      <div class="page-header"><div><h1 class="page-title">Payments</h1><p class="page-subtitle">Transaction history</p></div></div>
      <div class="card"><div id="payments-table"><div class="table-loading">Loading...</div></div></div>`;
    
    try {
        const [pSnap, uSnap, plSnap] = await Promise.all([ db.collection('payments').orderBy('date','desc').get(), db.collection('users').get(), db.collection('plans').get() ]);
        const uMap = {}; uSnap.forEach(d=>uMap[d.id]=d.data().name);
        const plMap = {}; plSnap.forEach(d=>plMap[d.id]=d.data().name);
        
        if(pSnap.empty) { document.getElementById('payments-table').innerHTML='<p class="empty-msg">No Payments</p>'; return; }
        document.getElementById('payments-table').innerHTML = `
          <table class="data-table">
            <thead><tr><th>Date</th><th>Member</th><th>Plan</th><th>Amount</th><th>Method</th><th>Status</th></tr></thead>
            <tbody>${pSnap.docs.map(d=>{
                const p=d.data();
                return `<tr>
                  <td>${formatDate(p.date)}</td>
                  <td>${uMap[p.memberId]||'Unknown'}</td>
                  <td>${plMap[p.planId]||'Plan'}</td>
                  <td class="text-gold">${formatINR(p.amount)}</td>
                  <td>${p.method}</td>
                  <td><span class="badge badge-success">Completed</span></td>
                </tr>`;
            }).join('')}</tbody>
          </table>`;
    } catch(e) { console.error(e); }
}

async function renderAnalyticsPage(container) {
    container.innerHTML = `
      <div class="page-header"><div><h1 class="page-title">Analytics</h1><p class="page-subtitle">Deep dive into data</p></div></div>
      <div class="card"><h3 style="margin-bottom:20px;text-align:center">Feature Coming Soon!</h3>
      <p style="text-align:center;color:var(--text-muted)">We are building comprehensive charts to view daily, weekly, and monthly growth.</p></div>
    `;
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
              ${p.profileImage ? `<img src="${p.profileImage}" alt="">` : (p.name||'A').charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 style="font-size:22px;margin-bottom:4px">${p.name||'Admin'}</h3>
              <div class="badge badge-red">ADMIN</div>
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
