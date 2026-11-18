import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import { Login } from './Login';
import { Signup } from './Signup';

function renderAuthPage(page: ReactNode) {
  return render(<MemoryRouter><AuthProvider>{page}</AuthProvider></MemoryRouter>);
}

describe('authentication form validation', () => {
  it('shows email and password errors on an invalid login form', () => {
    renderAuthPage(<Login />);
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'not-an-email' } });
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }).closest('form')!);

    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
  });

  it('validates name, email, and Cognito password policy on signup', () => {
    renderAuthPage(<Signup />);
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'bad-email' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } });
    fireEvent.submit(screen.getByRole('button', { name: /create account/i }).closest('form')!);

    expect(screen.getByText('Enter your name.')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByText(/Use at least 12 characters/)).toBeInTheDocument();
  });
});
