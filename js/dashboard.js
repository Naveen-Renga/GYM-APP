// ============================================================
// DASHBOARD.JS — Main orchestrator: routing, sidebar, auth
// ============================================================

let currentUser = null;
let currentProfile = null;
let currentPage = 'home';
let selectedBookingSlot = null;
let selectedPayMethod = 'upi';

// ── INIT ─────────────────────────────────────────────────────
requireAuth(async user => {
  currentUser = user;
  currentProfile = await getCurrentUserProfile();

  if (!currentProfile) {
    showToast('Profile not found. Please re-login.', 'error');
    auth.signOut(); return;
  }

  await seedDefaultData();
  setupSidebar();
  setupSidebarUser();
  loadPage('home');

  setTimeout(() => document.getElementById('page-loader').classList.add('hidden'), 600);
});

// ── SIDEBAR SETUP ────────────────────────────────────────────
function setupSidebar() {
  const role = currentProfile.role;
  const navItems = getNavItems(role);
  const nav = document.getElementById('sidebar-nav');

  nav.innerHTML = navItems.map(item => {
    if (item.divider) return `<div class="nav-section-label">${item.label}</div>`;
    return `
      <div class="nav-item" id="nav-${item.id}" onclick="loadPage('${item.id}')">
        <span class="nav-icon">${item.icon}</span>
        <span>${item.label}</span>
        ${item.badge ? `<span class="nav-badge">${item.badge}</span>` : ''}
      </div>`;
  }).join('');
}

function getNavItems(role) {
  const common = [
    { divider: true, label: 'MAIN' },
    { id: 'home',    icon: '📊', label: 'Dashboard' },
  ];
  const adminItems = [
    { divider: true, label: 'MANAGEMENT' },
    { id: 'members',  icon: '👥', label: 'Members' },
    { id: 'mentors',  icon: '🏅', label: 'Mentors' },
    { id: 'plans',    icon: '📋', label: 'Plans' },
    { id: 'bookings', icon: '📅', label: 'Bookings' },
    { id: 'payments', icon: '💳', label: 'Payments' },
    { divider: true, label: 'ANALYTICS' },
    { id: 'analytics',icon: '📈', label: 'Analytics' },
    { divider: true, label: 'ACCOUNT' },
    { id: 'profile',  icon: '👤', label: 'Profile' },
  ];
  const mentorItems = [
    { divider: true, label: 'MY WORK' },
    { id: 'my-members', icon: '👥', label: 'My Members' },
    { id: 'schedule',   icon: '📅', label: 'Schedule' },
    { id: 'progress',   icon: '📈', label: 'Progress' },
    { divider: true, label: 'ACCOUNT' },
    { id: 'profile', icon: '👤', label: 'Profile' },
  ];
  const memberItems = [
    { divider: true, label: 'MY GYM' },
    { id: 'my-plan',    icon: '📋', label: 'My Plan' },
    { id: 'my-mentor',  icon: '🏅', label: 'My Mentor' },
    { id: 'book',       icon: '📅', label: 'Book Session' },
    { id: 'my-workout', icon: '💪', label: 'Workout Plan' },
    { id: 'my-payments',icon: '💳', label: 'Payments' },
    { divider: true, label: 'ACCOUNT' },
    { id: 'profile', icon: '👤', label: 'Profile' },
  ];

  if (role === 'admin')  return [...common, ...adminItems];
  if (role === 'mentor') return [...common, ...mentorItems];
  return [...common, ...memberItems];
}

function setupSidebarUser() {
  const p = currentProfile;
  document.getElementById('user-name-sidebar').textContent = p.name || 'User';
  document.getElementById('user-role-sidebar').textContent = (p.role || 'member').toUpperCase();
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
    home:'Dashboard', members:'Members', mentors:'Mentors', plans:'Plans',
    bookings:'Bookings', payments:'Payments', analytics:'Analytics', profile:'Profile',
    'my-members':'My Members', schedule:'Schedule', progress:'Progress Tracking',
    'my-plan':'My Membership', 'my-mentor':'My Mentor', book:'Book Session',
    'my-workout':'Workout Plan', 'my-payments':'Payment History'
  };
  document.getElementById('topbar-title').textContent = titles[pageId] || 'Dashboard';
  document.getElementById('topbar-breadcrumb').textContent = `IronPeak › ${titles[pageId] || ''}`;

  const content = document.getElementById('main-content');
  content.innerHTML = `<div class="empty-state"><div class="empty-icon" style="animation:spin 1s linear infinite">⚙️</div><h3>Loading...</h3></div>`;

  const role = currentProfile.role;

  // Route by role + page
  if (role === 'admin') {
    switch(pageId) {
      case 'home':      await renderAdminDashboard(); break;
      case 'members':   await renderMembersPage(); break;
      case 'mentors':   await renderMentorsPage(); break;
      case 'plans':     await renderPlansPage(); break;
      case 'bookings':  await renderBookingsPage(); break;
      case 'payments':  await renderPaymentsPage(); break;
      case 'analytics': await renderAnalyticsPage(); break;
      case 'profile':   await renderProfilePage(); break;
      default: content.innerHTML = '<div class="empty-state"><div class="empty-icon">🚧</div><h3>Coming Soon</h3></div>';
    }
  } else if (role === 'mentor') {
    switch(pageId) {
      case 'home':       await renderMentorDashboard(); break;
      case 'my-members': await renderMentorMembers(); break;
      case 'schedule':   await renderMentorSchedule(); break;
      case 'progress':   await renderProgressPage(); break;
      case 'profile':    await renderProfilePage(); break;
      default: content.innerHTML = '<div class="empty-state"><div class="empty-icon">🚧</div><h3>Coming Soon</h3></div>';
    }
  } else {
    switch(pageId) {
      case 'home':        await renderMemberDashboard(); break;
      case 'my-plan':     await renderMyPlan(); break;
      case 'my-mentor':   await renderMyMentor(); break;
      case 'book':        renderBookPage(); break;
      case 'my-workout':  await renderWorkoutPage(); break;
      case 'my-payments': await renderMemberPayments(); break;
      case 'profile':     await renderProfilePage(); break;
      default: content.innerHTML = '<div class="empty-state"><div class="empty-icon">🚧</div><h3>Coming Soon</h3></div>';
    }
  }
}

// ── MODAL HELPERS ────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ── SIDEBAR MOBILE ───────────────────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('show');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('show');
}

// ── LOGOUT ───────────────────────────────────────────────────
async function handleLogout() {
  await auth.signOut();
  window.location.href = 'login.html';
}

// ── NOTIFICATION TOGGLE ──────────────────────────────────────
function toggleNotif() {
  document.getElementById('notif-panel').classList.toggle('hidden');
}
document.addEventListener('click', e => {
  const btn = document.getElementById('notif-btn');
  if (btn && !btn.contains(e.target)) {
    const panel = document.getElementById('notif-panel');
    if (panel) panel.classList.add('hidden');
  }
});

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
            ${p.profileImage ? `<img src="${p.profileImage}" alt="">` : (p.name||'U').charAt(0)}
          </div>
          <div>
            <h3 style="font-size:22px;margin-bottom:4px">${p.name||''}</h3>
            <div class="badge badge-green">${(p.role||'member').toUpperCase()}</div>
            <p style="font-size:13px;color:var(--text-muted);margin-top:6px">Member since ${formatDate(p.createdAt)}</p>
          </div>
        </div>
        <div class="form-group"><label class="form-label">Full Name</label><input type="text" id="prof-name" class="form-control" value="${p.name||''}"></div>
        <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-control" value="${p.email||''}" disabled></div>
        <div class="form-group"><label class="form-label">Phone</label><input type="tel" id="prof-phone" class="form-control" value="${p.phone||''}"></div>
        <div class="form-group">
          <label class="form-label">Profile Photo</label>
          <div class="upload-area" id="prof-upload-area">
            <input type="file" id="prof-photo" accept="image/*" onchange="previewProfilePhoto(this)">
            <div class="upload-icon">📷</div>
            <p>Click to upload photo (max 2MB)</p>
          </div>
        </div>
        <button class="btn btn-primary" onclick="saveProfile()"><span class="btn-text">Save Changes</span><span class="btn-loader"></span></button>
      </div>
      <div class="card mt-24">
        <div class="card-header"><div class="card-title">Change Password</div></div>
        <div class="form-group"><label class="form-label">New Password</label><input type="password" id="new-pwd" class="form-control" placeholder="Min. 6 characters"></div>
        <div class="form-group"><label class="form-label">Confirm Password</label><input type="password" id="new-pwd-confirm" class="form-control" placeholder="Repeat password"></div>
        <button class="btn btn-secondary" onclick="changePassword()">Update Password</button>
      </div>
    </div>`;
}

function previewProfilePhoto(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = e => {
      const av = document.getElementById('profile-avatar-display');
      if (av) av.innerHTML = `<img src="${e.target.result}" alt="">`;
    };
    reader.readAsDataURL(input.files[0]);
  }
}

async function saveProfile() {
  const name  = document.getElementById('prof-name').value.trim();
  const phone = document.getElementById('prof-phone').value.trim();
  const file  = document.getElementById('prof-photo').files[0];

  if (!name) { showToast('Name cannot be empty', 'warning'); return; }

  try {
    let imageUrl = currentProfile.profileImage || '';

    if (file) {
      if (file.size > 2 * 1024 * 1024) { showToast('Image too large (max 2MB)', 'error'); return; }
      const ref = storage.ref(`profile-images/${currentUser.uid}`);
      await ref.put(file);
      imageUrl = await ref.getDownloadURL();
    }

    await usersCol().doc(currentUser.uid).update({ name, phone, profileImage: imageUrl });
    await currentUser.updateProfile({ displayName: name });
    currentProfile.name = name; currentProfile.phone = phone; currentProfile.profileImage = imageUrl;
    setupSidebarUser();
    showToast('Profile updated!', 'success');
  } catch (e) { showToast('Error saving profile: ' + e.message, 'error'); }
}

async function changePassword() {
  const p1 = document.getElementById('new-pwd').value;
  const p2 = document.getElementById('new-pwd-confirm').value;
  if (!p1 || p1 !== p2) { showToast('Passwords do not match', 'error'); return; }
  if (p1.length < 6)    { showToast('Password too short (min 6)', 'error'); return; }
  try {
    await currentUser.updatePassword(p1);
    showToast('Password changed!', 'success');
  } catch (e) {
    if (e.code === 'auth/requires-recent-login') showToast('Please re-login before changing password', 'warning');
    else showToast(e.message, 'error');
  }
}

// ── SELECT PAYMENT METHOD ────────────────────────────────────
function selectPayMethod(el, method) {
  selectedPayMethod = method;
  document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('upi-fields').classList.toggle('hidden', method !== 'upi');
  document.getElementById('card-fields').classList.toggle('hidden', method !== 'card');
  document.getElementById('nb-fields').classList.toggle('hidden', method !== 'netbanking');
}
