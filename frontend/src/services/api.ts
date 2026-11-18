import { friendlyAuthError, getCognitoAccessToken } from './authService';

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  authenticated?: boolean;
  body?: unknown;
}

function apiBaseUrl() {
  const value = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!value || /your-api-id|example|placeholder/i.test(value)) {
    throw new ApiError('The API Gateway URL is not configured. Set VITE_API_BASE_URL in frontend/.env.local.', 0, 'API_NOT_CONFIGURED');
  }
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Unsupported URL protocol');
    return value.replace(/\/+$/, '');
  } catch {
    throw new ApiError('VITE_API_BASE_URL must be a valid HTTP or HTTPS URL.', 0, 'INVALID_API_URL');
  }
}

async function readResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    if (response.ok) throw new ApiError('The API returned an unreadable response.', response.status, 'INVALID_RESPONSE');
    return undefined;
  }
}

function errorFromResponse(status: number, payload: unknown) {
  const envelope = payload && typeof payload === 'object' ? payload as { error?: { code?: unknown; message?: unknown } } : undefined;
  const apiError = envelope?.error;
  const code = typeof apiError?.code === 'string' ? apiError.code : undefined;
  const message = typeof apiError?.message === 'string'
    ? apiError.message
    : status === 401 ? 'Your session is not valid. Sign in again.'
      : status === 403 ? 'You do not have permission to perform this action.'
        : status === 404 ? 'The requested resource could not be found.'
          : status >= 500 ? 'The EventPulse service is temporarily unavailable. Try again shortly.'
            : 'The request could not be completed. Check your details and try again.';
  return new ApiError(message, status, code);
}

function notifySessionExpired() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('eventpulse:auth-expired'));
}

/** Shared API Gateway client. Authenticated calls use Amplify's refreshed Cognito access token. */
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { authenticated = false, body, headers: inputHeaders, ...requestOptions } = options;
  const baseUrl = apiBaseUrl();
  const headers = new Headers(inputHeaders);
  if (body !== undefined) headers.set('Content-Type', 'application/json');

  if (authenticated) {
    try {
      headers.set('Authorization', `Bearer ${await getCognitoAccessToken()}`);
    } catch (authError) {
      const message = authError instanceof Error && authError.message.startsWith('No active Cognito access token')
        ? authError.message
        : friendlyAuthError(authError, 'session');
      throw new ApiError(message, 401, 'AUTHENTICATION_REQUIRED');
    }
  }

  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const send = () => fetch(url, {
    ...requestOptions,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let response: Response;
  try {
    response = await send();
  } catch {
    throw new ApiError('Could not reach the EventPulse API. Check your connection and API URL.', 0, 'NETWORK_ERROR');
  }

  if (authenticated && response.status === 401) {
    let refreshedToken: string;
    try {
      refreshedToken = await getCognitoAccessToken(true);
    } catch (refreshError) {
      notifySessionExpired();
      throw new ApiError(friendlyAuthError(refreshError, 'session'), 401, 'SESSION_EXPIRED');
    }
    headers.set('Authorization', `Bearer ${refreshedToken}`);
    try {
      response = await send();
    } catch {
      throw new ApiError('Could not reach the EventPulse API. Check your connection and API URL.', 0, 'NETWORK_ERROR');
    }
    if (response.status === 401) notifySessionExpired();
  }

  const payload = await readResponse(response);
  if (!response.ok) throw errorFromResponse(response.status, payload);
  return payload as T;
}
