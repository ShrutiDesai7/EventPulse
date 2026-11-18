import { Bell, CalendarDays, ChartNoAxesCombined, CircleHelp, LayoutDashboard, Ticket, UsersRound, X } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  open: boolean;
  onNavigate: () => void;
}

const primaryLinks = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true, signedIn: true },
  { to: '/events', label: 'Explore events', icon: CalendarDays, signedIn: false },
  { to: '/registrations', label: 'My registrations', icon: Ticket, signedIn: true },
  { to: '/notifications', label: 'Notifications', icon: Bell, signedIn: true },
];

export function Sidebar({ open, onNavigate }: SidebarProps) {
  const { user } = useAuth();
  const visibleLinks = primaryLinks.filter((link) => !link.signedIn || Boolean(user));
  const displayName = user?.name || user?.email || 'Guest account';
  const avatar = user?.name.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || user?.email[0]?.toUpperCase() || 'G';

  return (
    <aside id="primary-sidebar" className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <div className="brand-row">
        <Link to="/" className="brand" onClick={onNavigate}>
          <span className="brand-mark"><CalendarDays size={20} strokeWidth={2.3} /></span>
          <span>event<span className="brand-pulse">pulse</span><small>EVENTS, IN SYNC</small></span>
        </Link>
        <button className="icon-button sidebar-close" onClick={onNavigate} aria-label="Close navigation"><X size={19} /></button>
      </div>
      <p className="nav-caption">WORKSPACE</p>
      <nav className="side-nav" aria-label="Main navigation">
        {visibleLinks.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={onNavigate} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Icon size={18} strokeWidth={1.9} /><span>{label}</span>
          </NavLink>
        ))}
      </nav>
      {user?.role === 'ADMIN' && <><p className="nav-caption nav-caption-spaced">MANAGE</p><nav className="side-nav" aria-label="Management navigation"><NavLink to="/admin" onClick={onNavigate} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><ChartNoAxesCombined size={18} strokeWidth={1.9} /><span>Admin dashboard</span></NavLink></nav></>}
      <div className="sidebar-bottom">
        <div className="help-card"><span className="help-icon"><CircleHelp size={17} /></span><strong>Need a hand?</strong><p>For account access, contact your organisation administrator.</p></div>
        <div className="sidebar-user"><span className="avatar">{avatar}</span><span><strong>{displayName}</strong><small>{user?.role || 'Not signed in'}</small></span><UsersRound size={17} className="guest-icon" /></div>
      </div>
    </aside>
  );
}
