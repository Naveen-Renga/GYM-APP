# 🏋️ IronPeak Gym Management System

A complete, production-ready gym management web application built with vanilla HTML/CSS/JS and Firebase.

---

## 📁 Project Structure

```
gym-app/
├── index.html          ← Landing page
├── login.html          ← Login / Sign up / Reset
├── dashboard.html      ← Main app (all dashboards)
├── firebase.json       ← Firebase hosting config
├── firestore.rules     ← Firestore security rules
├── .firebaserc         ← Firebase project binding
├── css/
│   └── style.css       ← Complete global styles
├── js/
│   ├── firebase-config.js  ← Firebase init + utilities
│   ├── auth.js             ← Auth logic (login/signup)
│   ├── dashboard.js        ← Main router + layout
│   ├── admin.js            ← Admin pages
│   ├── mentor.js           ← Mentor pages
│   ├── member.js           ← Member pages
│   ├── booking.js          ← Booking system
│   └── payment.js          ← Payment simulation
└── assets/
    └── images/
```

---

## 🚀 Setup Instructions

### Step 1: Create Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Create a project"**
3. Enter project name: `ironpeak-gym` (or any name)
4. Disable Google Analytics (optional)
5. Click **Create Project**

---

### Step 2: Enable Authentication

1. In Firebase Console → **Authentication** → **Get Started**
2. Under **Sign-in method** → enable **Email/Password**
3. Click **Save**

---

### Step 3: Create Firestore Database

1. Firebase Console → **Firestore Database** → **Create database**
2. Choose **"Start in production mode"**
3. Select your region (e.g., `asia-south1` for India)
4. Click **Enable**

---

### Step 4: Enable Firebase Storage

1. Firebase Console → **Storage** → **Get Started**
2. Accept default rules → **Next** → **Done**

---

### Step 5: Add Your Firebase Config

1. Firebase Console → **Project Settings** (gear icon)
2. Under **"Your apps"** → click **Web** (</> icon)
3. Register the app (give it a name like "IronPeak Web")
4. Copy the `firebaseConfig` object
5. Open **`js/firebase-config.js`** and replace the placeholder:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",          // ← Your actual key
  authDomain: "ironpeak.firebaseapp.com",
  projectId: "ironpeak-gym",
  storageBucket: "ironpeak-gym.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

---

### Step 6: Deploy Firestore Rules

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login:
```bash
firebase login
```

3. Initialize in project folder (select Hosting + Firestore):
```bash
firebase init
```

4. Deploy rules:
```bash
firebase deploy --only firestore:rules
```

---

### Step 7: Deploy to Firebase Hosting

```bash
firebase deploy --only hosting
```

Your app will be live at: `https://YOUR_PROJECT_ID.web.app`

---

### Step 8: Create Your First Admin Account

1. Open the app → Login → **Create Account**
2. Sign up with your admin email (e.g., `admin@ironpeak.com`)
3. Go to **Firebase Console → Firestore → users collection**
4. Find your document → Edit → change `role` from `"member"` to `"admin"`
5. Refresh the app — you now have Admin access!

---

## 👤 User Roles

| Role    | Access |
|---------|--------|
| **Admin** | Full control: members, mentors, plans, payments, analytics |
| **Mentor** | View assigned members, update progress, view schedule |
| **Member** | View plan, book sessions, track workout, make payments |

---

## 💾 Firestore Collections

| Collection | Purpose |
|-----------|---------|
| `users` | All users (admin/mentor/member) |
| `members` | Member plan + expiry info |
| `plans` | Membership plans |
| `payments` | Payment records |
| `bookings` | Training session bookings |
| `progress` | Member fitness progress logs |

---

## 🎨 Features

- ✅ Dark industrial-luxury UI with neon accents
- ✅ Glassmorphism cards + 3D hover effects
- ✅ Fully responsive (mobile + desktop)
- ✅ Role-based dashboards (Admin / Mentor / Member)
- ✅ Real-time Firestore data
- ✅ Firebase Authentication
- ✅ Profile photo upload (Firebase Storage)
- ✅ Payment simulation (UPI / Card / Net Banking)
- ✅ Booking system with time slots
- ✅ Progress tracking charts
- ✅ Revenue & analytics charts (Chart.js)
- ✅ Toast notifications
- ✅ Loading states on all actions
- ✅ Search and filter on tables

---

## 🔧 Local Development

No build step needed! Just serve the files:

```bash
# Option 1: Python
python -m http.server 8080

# Option 2: Node.js
npx serve .

# Option 3: VS Code Live Server extension
# Right-click index.html → Open with Live Server
```

---

## 📱 Test Accounts (after setup)

Create via signup, then change role in Firestore:

| Email | Role to set |
|-------|------------|
| `admin@ironpeak.com` | `admin` |
| `trainer@ironpeak.com` | `mentor` |
| `member@ironpeak.com` | `member` (default) |

---

## 🇮🇳 Made for India

- INR (₹) currency formatting
- Indian phone number fields
- UPI payment simulation
- Major Indian banks in Net Banking
- Timezone-aware date display

---

**Built with:** Firebase v9 compat SDK, Chart.js v4, Google Fonts (Syne, Space Mono, DM Sans)
