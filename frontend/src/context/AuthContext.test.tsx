import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import { cognitoConfiguration } from '../services/cognitoConfig';
import { readCognitoUser, signOutFromCognito } from '../services/authService';

vi.mock('../services/authService', () => ({
  readCognitoUser: vi.fn(),
  signInWithCognito: vi.fn(),
  signOutFromCognito: vi.fn(),
  friendlyAuthError: vi.fn(() => 'Authentication error'),
}));

function AuthStateProbe() {
  const auth = useAuth();
  return <div><span>{auth.status}</span><span>{auth.user?.userId}</span><span>{auth.user?.role}</span><button onClick={() => void auth.signOut()}>Sign out test</button></div>;
}

describe('AuthContext', () => {
  beforeEach(() => {
    cognitoConfiguration.configured = true;
    vi.mocked(readCognitoUser).mockResolvedValue({ userId: 'cognito-sub-1', email: 'admin@example.test', name: 'Admin', role: 'ADMIN' });
    vi.mocked(signOutFromCognito).mockResolvedValue();
  });

  it('restores the identity and role returned from Cognito session claims', async () => {
    render(<AuthProvider><AuthStateProbe /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('authenticated')).toBeInTheDocument());
    expect(screen.getByText('cognito-sub-1')).toBeInTheDocument();
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });

  it('clears user state on sign out', async () => {
    render(<AuthProvider><AuthStateProbe /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('authenticated')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Sign out test' }));
    await waitFor(() => expect(screen.getByText('unauthenticated')).toBeInTheDocument());
    expect(screen.queryByText('cognito-sub-1')).not.toBeInTheDocument();
  });

  it('clears the local session when the API rejects the refreshed Cognito token', async () => {
    render(<AuthProvider><AuthStateProbe /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('authenticated')).toBeInTheDocument());
    window.dispatchEvent(new Event('eventpulse:auth-expired'));
    await waitFor(() => expect(screen.getByText('unauthenticated')).toBeInTheDocument());
    expect(signOutFromCognito).toHaveBeenCalled();
  });
});
