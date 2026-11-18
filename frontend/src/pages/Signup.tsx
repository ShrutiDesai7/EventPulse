import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { confirmCognitoSignup, friendlyAuthError, registerWithCognito, resendCognitoSignupCode } from '../services/authService';
import { validateSignupForm, type FieldErrors } from '../services/authValidation';

interface SignupLocationState { email?: string; verify?: boolean }

export function Signup() {
  const location = useLocation();
  const navigate = useNavigate();
  const { status } = useAuth();
  const initial = (location.state || {}) as SignupLocationState;
  const [step, setStep] = useState<'signup' | 'verify'>(initial.verify ? 'verify' : 'signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initial.email || '');
  const [password, setPassword] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(''); setMessage('');
    const errors = validateSignupForm(name, email, password);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const result = await registerWithCognito(email, password, name);
      if (result.nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
        setStep('verify');
        setMessage(`A confirmation code was sent${result.nextStep.codeDeliveryDetails?.destination ? ` to ${result.nextStep.codeDeliveryDetails.destination}` : ' to your email'}.`);
      } else if (result.nextStep.signUpStep === 'DONE') {
        navigate('/login', { replace: true, state: { email: email.trim(), notice: 'Your account is ready. Sign in to continue.' } });
      } else {
        setError('Cognito requested another account setup step that is not available for this user pool.');
      }
    } catch (signupError) {
      setError(friendlyAuthError(signupError, 'signup'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setMessage('');
    if (!confirmationCode.trim()) { setFieldErrors({ confirmationCode: 'Enter the code from your email.' }); return; }
    setFieldErrors({}); setSubmitting(true);
    try {
      const result = await confirmCognitoSignup(email, confirmationCode);
      if (result.nextStep.signUpStep === 'DONE') {
        navigate('/login', { replace: true, state: { email: email.trim(), notice: 'Email verified. Sign in to your account.' } });
      } else {
        setError('Cognito requested another verification step. Please try again.');
      }
    } catch (confirmationError) {
      setError(friendlyAuthError(confirmationError, 'verify'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError(''); setMessage(''); setSubmitting(true);
    try {
      await resendCognitoSignupCode(email);
      setMessage('A new confirmation code was requested. Check your email.');
    } catch (resendError) {
      setError(friendlyAuthError(resendError, 'verify'));
    } finally {
      setSubmitting(false);
    }
  };

  const configMissing = status === 'unavailable';

  return <main className="auth-page"><div className="auth-art"><Link to="/" className="brand auth-brand"><span className="brand-mark"><CalendarDays size={20} /></span><span>event<span className="brand-pulse">pulse</span><small>EVENTS, IN SYNC</small></span></Link><div className="auth-art-copy"><span className="welcome-kicker"><span className="auth-star">✦</span> YOUR NEXT CHAPTER STARTS HERE</span><h1>Find your people.<br /><em>Find your thing.</em></h1><p>Join the communities creating the moments you’ll remember.</p><div className="auth-art-foot"><span className="signup-graphic">✳</span><span>One small yes can<br />make a great story.</span></div></div><span className="auth-decoration auth-decoration-one" /><span className="auth-decoration auth-decoration-two" /></div><div className="auth-panel"><Link to="/" className="auth-back"><ArrowLeft size={16} /> Back home</Link><div className="auth-form-wrap"><span className="section-label">{step === 'signup' ? 'JOIN THE COMMUNITY' : 'EMAIL VERIFICATION'}</span><h2>{step === 'signup' ? 'Create your account' : 'Check your inbox'}</h2><p className="auth-subtitle">{step === 'signup' ? 'A little detail, then you’re on your way.' : `Enter the confirmation code sent to ${email || 'your email address'}.`}</p>
    {configMissing && <div className="auth-alert auth-alert-info" role="status">Add your Cognito User Pool ID, app client ID, and region to <code>frontend/.env.local</code> to enable account creation.</div>}
    {message && <div className="auth-alert auth-alert-success" role="status"><CheckCircle2 size={16} />{message}</div>}
    {error && <div className="auth-alert auth-alert-error" role="alert">{error}</div>}
    {step === 'signup' ? <form onSubmit={handleSignup} noValidate><label className="field-label" htmlFor="name">Your name</label><div className={`input-wrap ${fieldErrors.name ? 'input-invalid' : ''}`}><UserRound size={17} /><input id="name" name="name" autoComplete="name" placeholder="What should we call you?" value={name} onChange={(event) => setName(event.target.value)} aria-invalid={Boolean(fieldErrors.name)} /></div>{fieldErrors.name && <p className="field-error">{fieldErrors.name}</p>}
    <label className="field-label field-label-space" htmlFor="signup-email">Email address</label><div className={`input-wrap ${fieldErrors.email ? 'input-invalid' : ''}`}><Mail size={17} /><input id="signup-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(fieldErrors.email)} /></div>{fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}
    <label className="field-label field-label-space" htmlFor="signup-password">Password</label><div className={`input-wrap ${fieldErrors.password ? 'input-invalid' : ''}`}><LockKeyhole size={17} /><input id="signup-password" name="password" type="password" autoComplete="new-password" placeholder="Create a password" value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? 'signup-password-error' : 'password-requirements'} /></div>{fieldErrors.password ? <p className="field-error" id="signup-password-error">{fieldErrors.password}</p> : <p className="password-hint" id="password-requirements">12+ characters, upper and lowercase, a number, and a symbol.</p>}
    <button className="button button-primary auth-submit" type="submit" disabled={submitting}>{submitting ? <><span className="spinner spinner-light" /> Creating account…</> : <>Create account <ArrowRight size={16} /></>}</button></form> : <form onSubmit={handleConfirm} noValidate><label className="field-label" htmlFor="confirmation-code">Confirmation code</label><div className={`input-wrap ${fieldErrors.confirmationCode ? 'input-invalid' : ''}`}><Mail size={17} /><input id="confirmation-code" name="confirmationCode" inputMode="numeric" autoComplete="one-time-code" placeholder="Enter your code" value={confirmationCode} onChange={(event) => setConfirmationCode(event.target.value)} aria-invalid={Boolean(fieldErrors.confirmationCode)} /></div>{fieldErrors.confirmationCode && <p className="field-error">{fieldErrors.confirmationCode}</p>}<button className="button button-primary auth-submit" type="submit" disabled={submitting}>{submitting ? <><span className="spinner spinner-light" /> Verifying…</> : <>Verify email <ArrowRight size={16} /></>}</button><button className="resend-code" type="button" onClick={handleResend} disabled={submitting}>Didn’t receive a code? <strong>Resend code</strong></button></form>}
    <p className="auth-note">Authentication and verification are handled by Amazon Cognito.</p><p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p><div className="auth-security"><LockKeyhole size={14} /> Your details are protected by Cognito.</div></div></div></main>;
}
