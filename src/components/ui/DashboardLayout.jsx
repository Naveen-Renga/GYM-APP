// src/components/ui/DashboardLayout.jsx
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useLocation } from 'react-router-dom';

const pageTitles = {
  '/admin': 'Dashboard',
  '/admin/mentors': 'Mentors',
  '/admin/members': 'Members',
  '/admin/plans': 'Membership Plans',
  '/admin/bookings': 'Bookings',
  '/admin/payments': 'Payments',
  '/admin/settings': 'Settings',
  '/mentor': 'Dashboard',
  '/mentor/members': 'My Members',
  '/mentor/workouts': 'Workout Plans',
  '/mentor/schedule': 'Schedule',
  '/mentor/messages': 'Messages',
  '/member': 'Dashboard',
  '/member/plan': 'My Plan',
  '/member/mentor': 'My Mentor',
  '/member/workout': 'Workout Plan',
  '/member/book': 'Book Session',
  '/member/payments': 'Payments',
  '/member/progress': 'Progress',
  '/member/messages': 'Messages',
};

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'Dashboard';

  return (
    <div className="flex h-screen bg-mesh overflow-hidden">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col lg:ml-64 overflow-hidden">
        <Topbar title={title} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
