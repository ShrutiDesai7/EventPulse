import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Sidebar } from './Sidebar';

const auth = vi.hoisted(() => ({ user: null as null | { userId: string; email: string; name: string; role: 'USER' | 'ADMIN' } }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));

function renderSidebar() { return render(<MemoryRouter><Sidebar open={false} onNavigate={vi.fn()} /></MemoryRouter>); }

describe('sidebar navigation visibility', () => {
  beforeEach(() => { auth.user = null; });

  it('shows public event browsing but no authenticated or admin links to guests', () => {
    renderSidebar();
    expect(screen.getByRole('link', { name: 'Explore events' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'My registrations' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Notifications' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Admin dashboard' })).not.toBeInTheDocument();
  });

  it('shows user pages to signed-in users but reserves admin navigation for ADMIN claims', () => {
    auth.user = { userId: 'u1', email: 'user@example.test', name: 'User', role: 'USER' };
    const { rerender } = renderSidebar();
    expect(screen.getByRole('link', { name: 'My registrations' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Admin dashboard' })).not.toBeInTheDocument();

    auth.user = { userId: 'a1', email: 'admin@example.test', name: 'Admin', role: 'ADMIN' };
    rerender(<MemoryRouter><Sidebar open={false} onNavigate={vi.fn()} /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Admin dashboard' })).toBeInTheDocument();
  });
});
