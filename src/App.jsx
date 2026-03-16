// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/ui/DashboardLayout';
import LoginPage from './pages/LoginPage';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminMentors from './pages/admin/Mentors';
import AdminMembers from './pages/admin/Members';
import AdminPlans from './pages/admin/Plans';
import AdminBookings from './pages/admin/Bookings';
import AdminPayments from './pages/admin/Payments';
import AdminSettings from './pages/admin/Settings';

// Mentor pages
import MentorDashboard from './pages/mentor/Dashboard';
import MentorMembers from './pages/mentor/Members';
import MentorWorkouts from './pages/mentor/WorkoutPlans';
import MentorSchedule from './pages/mentor/Schedule';
import MentorMessages from './pages/mentor/Messages';
import MentorAttendance from './pages/mentor/Attendance';

// Member pages
import MemberDashboard from './pages/member/Dashboard';
import MemberPlan from './pages/member/MyPlan';
import MemberMentor from './pages/member/MyMentor';
import MemberWorkout from './pages/member/WorkoutPlan';
import MemberBook from './pages/member/BookSession';
import MemberPayments from './pages/member/Payments';
import MemberProgress from './pages/member/Progress';
import MemberMessages from './pages/member/Messages';
import MemberAttendance from './pages/member/Attendance';

function RootRedirect() {
  const { role, loading } = useAuth();
  if (loading) return null;
  if (!role) return <Navigate to="/login" replace />;
  const map = { admin: '/admin', mentor: '/mentor', member: '/member' };
  return <Navigate to={map[role] || '/login'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#12121F',
              color: '#e2e8f0',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#00F5A0', secondary: '#070710' } },
            error:   { iconTheme: { primary: '#EF4444', secondary: '#070710' } },
          }}
        />

        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RootRedirect />} />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={<ProtectedRoute allowedRole="admin"><DashboardLayout /></ProtectedRoute>}
          >
            <Route index element={<AdminDashboard />} />
            <Route path="mentors" element={<AdminMentors />} />
            <Route path="members" element={<AdminMembers />} />
            <Route path="plans" element={<AdminPlans />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Mentor Routes */}
          <Route
            path="/mentor"
            element={<ProtectedRoute allowedRole="mentor"><DashboardLayout /></ProtectedRoute>}
          >
            <Route index element={<MentorDashboard />} />
            <Route path="members" element={<MentorMembers />} />
            <Route path="workouts" element={<MentorWorkouts />} />
            <Route path="schedule" element={<MentorSchedule />} />
            <Route path="messages" element={<MentorMessages />} />
            <Route path="attendance" element={<MentorAttendance />} />
          </Route>

          {/* Member Routes */}
          <Route
            path="/member"
            element={<ProtectedRoute allowedRole="member"><DashboardLayout /></ProtectedRoute>}
          >
            <Route index element={<MemberDashboard />} />
            <Route path="plan" element={<MemberPlan />} />
            <Route path="mentor" element={<MemberMentor />} />
            <Route path="workout" element={<MemberWorkout />} />
            <Route path="book" element={<MemberBook />} />
            <Route path="payments" element={<MemberPayments />} />
            <Route path="progress" element={<MemberProgress />} />
            <Route path="messages" element={<MemberMessages />} />
            <Route path="attendance" element={<MemberAttendance />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
