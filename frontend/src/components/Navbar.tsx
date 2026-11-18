import { Bell, LogOut, Menu, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { RefObject } from 'react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  onMenuClick: () => void;
  menuOpen: boolean;
  menuButtonRef: RefObject<HTMLButtonElement>;
}

export function Navbar({ onMenuClick, menuOpen, menuButtonRef }: NavbarProps) {
  const { user, status, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // AuthContext clears the local session state even if remote Cognito cleanup fails.
    } finally {
      navigate('/login', { replace: true });
    }
  };

  const initials = user?.name.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || user?.email[0]?.toUpperCase() || 'EP';

  return (
    <header className="topbar">
      <button ref={menuButtonRef} className="icon-button menu-toggle" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="primary-sidebar" onClick={onMenuClick}><Menu size={21} /></button>
      <Link className="topbar-search" to="/events" aria-label="Explore events"><Search size={17} /><span>Explore events</span></Link>
      <div className="topbar-actions">
        {status === 'authenticated' && user ? <><Link className="icon-button notification-action" to="/notifications" aria-label="Notifications"><Bell size={19} /></Link><span className="profile-chip"><span className="avatar avatar-small">{initials}</span><span className="profile-label">{user.name || user.email}</span></span><button className="icon-button" onClick={handleSignOut} aria-label="Sign out" title="Sign out"><LogOut size={18} /></button></> : <Link className="profile-chip" to="/login" aria-label="Sign in"><span className="avatar avatar-small">EP</span><span className="profile-label">Sign in</span></Link>}
      </div>
    </header>
  );
}
