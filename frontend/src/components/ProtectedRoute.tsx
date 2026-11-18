import { ShieldAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { AppRole } from '../types/Auth';
import { Loading } from './Loading';

interface ProtectedRouteProps {
  children: ReactNode;
  roles?: AppRole[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { status, user, error } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <Loading label="Checking your session…" />;
  if (status === 'unavailable') {
    return <div className="auth-route-message"><div className="empty-icon"><ShieldAlert size={24} /></div><h1>Cognito setup needed</h1><p>Set the Cognito User Pool ID, app client ID, and AWS region in <code>frontend/.env.local</code> to sign in.</p><Link className="button button-primary" to="/login">Go to sign in</Link></div>;
  }
  if (!user || status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location, sessionMessage: error }} />;
  }
  if (roles && !roles.includes(user.role)) {
    return <div className="auth-route-message"><div className="empty-icon"><ShieldAlert size={24} /></div><h1>Access restricted</h1><p>This area is available to {roles.join(' or ')} accounts.</p><Link className="button button-primary" to="/">Return to your dashboard</Link></div>;
  }
  return children;
}
