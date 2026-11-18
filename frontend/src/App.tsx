import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { AdminDashboard } from './pages/AdminDashboard';
import { Dashboard } from './pages/Dashboard';
import { EventDetails } from './pages/EventDetails';
import { Events } from './pages/Events';
import { Login } from './pages/Login';
import { MyRegistrations } from './pages/MyRegistrations';
import { Notifications } from './pages/Notifications';
import { Signup } from './pages/Signup';
import { ProtectedRoute } from './components/ProtectedRoute';
import type { ReactNode } from 'react';

function PrivatePage({ children }: { children: ReactNode }) {
  return <ProtectedRoute roles={['USER', 'ADMIN']}>{children}</ProtectedRoute>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<PrivatePage><Dashboard /></PrivatePage>} />
        <Route path="events" element={<Events />} />
        <Route path="events/:eventId" element={<EventDetails />} />
        <Route path="registrations" element={<PrivatePage><MyRegistrations /></PrivatePage>} />
        <Route path="notifications" element={<PrivatePage><Notifications /></PrivatePage>} />
        <Route path="admin" element={<ProtectedRoute roles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
      </Route>
      <Route path="login" element={<Login />} />
      <Route path="signup" element={<Signup />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return <AppRoutes />;
}
