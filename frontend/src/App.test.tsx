import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AppRoutes } from './App';
import { AuthProvider } from './context/AuthContext';

vi.mock('./services/eventService', () => ({ listEvents: vi.fn().mockResolvedValue([]) }));

describe('application routes', () => {
  it('renders the events foundation route inside the shared application shell', async () => {
    render(<MemoryRouter initialEntries={['/events']}><AuthProvider><AppRoutes /></AuthProvider></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'Explore events' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    expect(await screen.findByText('No events have been published yet')).toBeInTheDocument();
  });
});
