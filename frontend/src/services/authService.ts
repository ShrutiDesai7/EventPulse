import {
  confirmSignUp,
  fetchAuthSession,
  getCurrentUser as amplifyGetCurrentUser,
  resendSignUpCode,
  signIn,
  signOut,
  signUp,
  type SignInOutput,
} from 'aws-amplify/auth';
import type { AuthUser } from '../types/Auth';
import { cognitoConfiguration } from './cognitoConfig';

export type CognitoSignInResult = SignInOutput;

export function requireCognitoConfiguration() {
  if (!cognitoConfiguration.configured) {
    throw new Error(`Cognito is not configured. Set ${cognitoConfiguration.missing.join(', ')} in frontend/.env.local.`);
  }
}

export async function registerWithCognito(email: string, password: string, name: string) {
  requireCognitoConfiguration();
  return signUp({
    username: email.trim().toLowerCase(),
    password,
    options: { userAttributes: { email: email.trim().toLowerCase(), name: name.trim() } },
  });
}

export async function confirmCognitoSignup(email: string, confirmationCode: string) {
  requireCognitoConfiguration();
  return confirmSignUp({ username: email.trim().toLowerCase(), confirmationCode: confirmationCode.trim() });
}

export async function resendCognitoSignupCode(email: string) {
  requireCognitoConfiguration();
  return resendSignUpCode({ username: email.trim().toLowerCase() });
}

export async function signInWithCognito(email: string, password: string) {
  requireCognitoConfiguration();
  return signIn({ username: email.trim().toLowerCase(), password });
}

export async function getCognitoAccessToken(forceRefresh = false) {
  requireCognitoConfiguration();
  const session = await fetchAuthSession({ forceRefresh });
  const token = session.tokens?.accessToken;
  if (!token) throw new Error('No active Cognito access token. Sign in and try again.');
  return token.toString();
}

export async function signOutFromCognito() {
  if (cognitoConfiguration.configured) await signOut();
}

function claimString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function cognitoGroups(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((group): group is string => typeof group === 'string');
  if (typeof value === 'string') return value.split(',').map((group) => group.trim()).filter(Boolean);
  return [];
}

/** Amplify refreshes expired tokens when possible; identity and role come from Cognito-issued token claims. */
export async function readCognitoUser(): Promise<AuthUser | null> {
  requireCognitoConfiguration();
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken;
  if (!token) return null;

  const current = await amplifyGetCurrentUser();
  const claims = token.payload;
  const userId = claimString(claims.sub) || current.userId;
  if (!userId) throw new Error('Cognito session did not contain a user identity.');

  // Cognito only assigns ADMIN through its trusted ADMIN group. Ordinary pool members are USER.
  const groups = [
    ...cognitoGroups(claims['cognito:groups']),
    ...cognitoGroups(session.tokens?.accessToken.payload['cognito:groups']),
  ];

  return {
    userId,
    email: claimString(claims.email) || current.username,
    name: claimString(claims.name),
    role: groups.includes('ADMIN') ? 'ADMIN' : 'USER',
  };
}

export function friendlyAuthError(error: unknown, intent: 'login' | 'signup' | 'verify' | 'session' = 'login') {
  const name = error instanceof Error ? error.name : '';
  const message = error instanceof Error ? error.message : '';
  if (message.startsWith('Cognito is not configured')) return message;

  switch (name) {
    case 'UserNotFoundException':
    case 'NotAuthorizedException':
      return intent === 'session'
        ? 'Your session expired or could not be refreshed. Please sign in again.'
        : 'Email or password is incorrect. If you have not verified your email, confirm your account first.';
    case 'UserNotConfirmedException':
      return 'Please verify your email address with the confirmation code before signing in.';
    case 'UsernameExistsException':
      return 'An account with this email already exists. Try signing in instead.';
    case 'InvalidPasswordException':
    case 'InvalidParameterException':
      return 'The password does not meet the account requirements. Use at least 12 characters with uppercase, lowercase, a number, and a symbol.';
    case 'CodeMismatchException':
      return 'That verification code is incorrect. Check the email and try again.';
    case 'ExpiredCodeException':
      return 'That verification code has expired. Request a new code and try again.';
    case 'TooManyRequestsException':
    case 'LimitExceededException':
      return 'Too many attempts. Wait a little while and try again.';
    case 'NetworkError':
    case 'TypeError':
      return 'Could not reach Cognito. Check your connection and try again.';
    default:
      return intent === 'verify'
        ? 'We could not verify this account. Check the code or request a new one.'
        : 'We could not complete that request. Please try again.';
  }
}
