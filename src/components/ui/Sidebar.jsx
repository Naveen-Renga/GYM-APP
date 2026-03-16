// src/components/ui/Sidebar.jsx
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { logout } from '../../firebase/auth';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const navConfig = {
  admin: [
    { path: '/admin', label: 'Dashboard', icon: '⚡' },
    { path: '/admin/mentors', label: 'Mentors', icon: '🏅' },
    { path: '/admin/members', label: 'Members', icon: '👥' },
    { path: '/admin/plans', label: 'Plans', icon: '💎' },
    { path: '/admin/bookings', label: 'Bookings', icon: '📅' },
    { path: '/admin/payments', label: 'Payments', icon: '💳' },
    { path: '/admin/settings', label: 'Settings', icon: '⚙️' },
  ],
  mentor: [
    { path: '/mentor', label: 'Dashboard', icon: '⚡' },
    { path: '/mentor/members', label: 'My Members', icon: '👥' },
    { path: '/mentor/workouts', label: 'Workout Plans', icon: '🏋️' },
    { path: '/mentor/schedule', label: 'Schedule', icon: '📅' },
    { path: '/mentor/attendance', label: 'Attendance', icon: '📝' },
    { path: '/mentor/messages', label: 'Messages', icon: '💬' },
  ],
  member: [
    { path: '/member', label: 'Dashboard', icon: '⚡' },
    { path: '/member/plan', label: 'My Plan', icon: '💎' },
    { path: '/member/attendance', label: 'Attendance', icon: '📝' },
    { path: '/member/mentor', label: 'My Mentor', icon: '🏅' },
    { path: '/member/workout', label: 'Workout Plan', icon: '🏋️' },
    { path: '/member/book', label: 'Book Session', icon: '📅' },
    { path: '/member/payments', label: 'Payments', icon: '💳' },
    { path: '/member/progress', label: 'Progress', icon: '📈' },
    { path: '/member/messages', label: 'Messages', icon: '💬' },
  ],
};

const roleBadgeColor = {
  admin: 'bg-red-500/20 text-red-400 border-red-500/30',
  mentor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  member: 'bg-neon-green/20 text-neon-green border-neon-green/30',
};

export default function Sidebar({ mobileOpen, onClose }) {
  const { profile, role } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
      toast.success('Logged out successfully');
    } catch {
      toast.error('Logout failed');
    }
  };

  const navItems = navConfig[role] || [];
  const initials = (profile?.name || 'U').charAt(0).toUpperCase();

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-green to-neon-blue flex items-center justify-center text-dark-900 font-black text-lg shadow-glow-green">
            🏋️
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-none">IronForge</h1>
            <p className="text-slate-500 text-xs mt-0.5">Gym Management</p>
          </div>
        </div>
      </div>

      {/* User Card */}
      <div className="px-4 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neon-purple to-neon-blue flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">{profile?.name || 'User'}</p>
            <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${roleBadgeColor[role]}`}>
              {role?.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-slate-600 text-xs font-semibold uppercase tracking-widest px-3 mb-3">Navigation</p>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/admin' || item.path === '/mentor' || item.path === '/member'}
            onClick={onClose}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-6 border-t border-white/[0.06] pt-4">
        <button
          onClick={handleLogout}
          className="nav-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 h-screen bg-dark-800/80 backdrop-blur-xl border-r border-white/[0.06] fixed left-0 top-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 h-screen w-64 bg-dark-800 border-r border-white/[0.06] z-50 lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
