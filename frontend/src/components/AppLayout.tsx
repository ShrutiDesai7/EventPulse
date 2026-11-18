import { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (menuOpen) document.querySelector<HTMLElement>('#primary-sidebar nav a[href]')?.focus();
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  const closeMenu = () => {
    setMenuOpen(false);
    if (window.matchMedia('(max-width: 820px)').matches) menuButtonRef.current?.focus();
  };

  return (
    <div className="app-frame">
      <Sidebar open={menuOpen} onNavigate={closeMenu} />
      {menuOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={closeMenu} />}
      <div className="app-main">
        <Navbar menuOpen={menuOpen} menuButtonRef={menuButtonRef} onMenuClick={() => setMenuOpen((open) => !open)} />
        <main className="page-container"><Outlet /></main>
        <footer className="app-footer"><span>EventPulse</span><span>Events, in sync.</span></footer>
      </div>
    </div>
  );
}
