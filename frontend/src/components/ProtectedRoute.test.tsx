import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import { readCognitoUser } from '../services/authService';
import { cognitoConfiguration } from '../services/cognitoConfig';
import { ProtectedRoute } from './ProtectedRoute';

vi.mock('../services/authService', () => ({
  readCognitoUser: vi.fn(),
  signInWithCognito: vi.fn(),
  signOutFromCognito: vi.fn(),
  friendlyAuthError: vi.fn(() => 'Authentication error'),
}));

function renderAdminRoute() {
  return render(<MemoryRouter initialEntries={['/admin']}><AuthProvider><Routes><Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><h1>Admin area</h1></ProtectedRoute>} /><Route path="/login" element={<h1>Login destination</h1>} /></Routes></AuthProvider></MemoryRouter>);
}

describe('ProtectedRoute', () => {
  beforeEach(() => { cognitoConfiguration.configured = true; });

  it('allows an ADMIN claim into the admin route', async () => {
    vi.mocked(readCognitoUser).mockResolvedValue({ userId: 'admin-sub', email: 'admin@example.test', name: 'Admin', role: 'ADMIN' });
    renderAdminRoute();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Admin area' })).toBeInTheDocument());
  });

  it('blocks USER from the admin route', async () => {
    vi.mocked(readCognitoUser).mockResolvedValue({ userId: 'user-sub', email: 'user@example.test', name: 'User', role: 'USER' });
    renderAdminRoute();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Access restricted' })).toBeInTheDocument());
  });

  it('redirects an unauthenticated visitor to login', async () => {
    vi.mocked(readCognitoUser).mockResolvedValue(null);
    renderAdminRoute();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Login destination' })).toBeInTheDocument());
  });
});
