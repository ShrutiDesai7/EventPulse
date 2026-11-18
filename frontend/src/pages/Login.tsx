import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, LockKeyhole, Mail } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { friendlyAuthError } from '../services/authService';
import { validateLoginForm, type FieldErrors } from '../services/authValidation';

interface LoginLocationState {
  from?: { pathname?: string };
  sessionMessage?: string | null;
  notice?: string;
  email?: string;
}

export function Login() {
  const { status, user, signIn, clearError } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const locationState = (location.state || {}) as LoginLocationState;
  const [email, setEmail] = useState(locationState.email || '');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState(locationState.notice || locationState.sessionMessage || '');
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated' && user) return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/'} replace />;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');
    clearError();
    const errors = validateLoginForm(email, password);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const { result, user: signedInUser } = await signIn(email, password);
      if (result.nextStep.signInStep === 'CONFIRM_SIGN_UP') {
        navigate('/signup', { state: { email: email.trim(), verify: true } });
        return;
      }
      if (!result.isSignedIn || !signedInUser) {
        setError(result.nextStep.signInStep === 'RESET_PASSWORD'
          ? 'Your password needs to be reset before you can continue.'
          : 'Cognito requested another sign-in step that is not configured for this account.');
        return;
      }
      const destination = locationState.from?.pathname || (signedInUser.role === 'ADMIN' ? '/admin' : '/');
      navigate(destination, { replace: true });
    } catch (authError) {
      if (authError instanceof Error && authError.name === 'UserNotConfirmedException') {
        navigate('/signup', { state: { email: email.trim(), verify: true } });
      } else {
        setError(friendlyAuthError(authError, 'login'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const configMissing = status === 'unavailable';

  return <main className="auth-page"><div className="auth-art"><Link to="/" className="brand auth-brand"><span className="brand-mark"><CalendarDays size={20} /></span><span>event<span className="brand-pulse">pulse</span><small>EVENTS, IN SYNC</small></span></Link><div className="auth-art-copy"><span className="welcome-kicker"><span className="auth-star">✦</span> FIND YOUR NEXT MOMENT</span><h1>Make room for<br /><em>something good.</em></h1><p>From the first hello to the final encore, stay connected to the moments that bring us together.</p><div className="auth-art-foot"><span className="avatar-stack"><i>J</i><i>M</i><i>A</i><i>+</i></span><span>Good things happen<br />when we show up.</span></div></div><span className="auth-decoration auth-decoration-one" /><span className="auth-decoration auth-decoration-two" /></div><div className="auth-panel"><Link to="/" className="auth-back"><ArrowLeft size={16} /> Back home</Link><div className="auth-form-wrap"><span className="section-label">WELCOME BACK</span><h2>Sign in to EventPulse</h2><p className="auth-subtitle">Your community is just around the corner.</p>
    {configMissing && <div className="auth-alert auth-alert-info" role="status">Add your Cognito User Pool ID, app client ID, and region to <code>frontend/.env.local</code> to enable sign-in.</div>}
    {message && <div className="auth-alert auth-alert-info" role="status">{message}</div>}
    {error && <div className="auth-alert auth-alert-error" role="alert">{error}</div>}
    <form onSubmit={handleSubmit} noValidate><label className="field-label" htmlFor="email">Email address</label><div className={`input-wrap ${fieldErrors.email ? 'input-invalid' : ''}`}><Mail size={17} /><input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? 'email-error' : undefined} /></div>{fieldErrors.email && <p className="field-error" id="email-error">{fieldErrors.email}</p>}
    <label className="field-label field-label-space" htmlFor="password">Password</label><div className={`input-wrap ${fieldErrors.password ? 'input-invalid' : ''}`}><LockKeyhole size={17} /><input id="password" name="password" type="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? 'password-error' : undefined} /></div>{fieldErrors.password && <p className="field-error" id="password-error">{fieldErrors.password}</p>}
    <button className="button button-primary auth-submit" type="submit" disabled={submitting}>{submitting ? <><span className="spinner spinner-light" /> Signing in…</> : <>Sign in <ArrowRight size={16} /></>}</button></form><p className="auth-note">Your session is managed securely by Amazon Cognito.</p><p className="auth-switch">New to EventPulse? <Link to="/signup">Create an account</Link></p><div className="auth-security"><LockKeyhole size={14} /> Your account is protected with secure sign-in.</div></div></div></main>;
}
