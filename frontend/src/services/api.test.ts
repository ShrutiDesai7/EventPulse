import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from './api';
import { getCognitoAccessToken } from './authService';

vi.mock('./authService', () => ({
  friendlyAuthError: vi.fn(() => 'Your session expired. Sign in again.'),
  getCognitoAccessToken: vi.fn(),
}));

const okResponse = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) }) as Response;

describe('API client', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://abc123.execute-api.ap-southeast-2.amazonaws.com');
    vi.stubGlobal('fetch', vi.fn());
    vi.mocked(getCognitoAccessToken).mockResolvedValue('cognito-access-token');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('joins the configured API URL and parses a public response', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse([{ eventId: 'e1' }]));
    const result = await apiRequest<Array<{ eventId: string }>>('/events', { method: 'GET' });
    expect(result).toEqual([{ eventId: 'e1' }]);
    expect(fetch).toHaveBeenCalledWith('https://abc123.execute-api.ap-southeast-2.amazonaws.com/events', expect.objectContaining({ method: 'GET' }));
    expect(new Headers(vi.mocked(fetch).mock.calls[0][1]?.headers).has('Authorization')).toBe(false);
  });

  it('attaches the refreshed Cognito access token for authenticated requests', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse({ eventId: 'e1' }, 201));
    await apiRequest('/events', { method: 'POST', authenticated: true, body: { title: 'Meetup' } });
    const init = vi.mocked(fetch).mock.calls[0][1];
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer cognito-access-token');
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json');
    expect(init?.body).toBe(JSON.stringify({ title: 'Meetup' }));
  });

  it('surfaces the backend error envelope and status code', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse({ success: false, data: null, error: { code: 'ACCESS_DENIED', message: 'Administrator role is required' } }, 403));
    await expect(apiRequest('/events', { method: 'POST', authenticated: true, body: {} })).rejects.toMatchObject({ status: 403, code: 'ACCESS_DENIED', message: 'Administrator role is required' });
  });

  it('forces a token refresh and retries one authenticated request after a 401', async () => {
    vi.mocked(getCognitoAccessToken).mockResolvedValueOnce('expired-token').mockResolvedValueOnce('refreshed-token');
    vi.mocked(fetch).mockResolvedValueOnce(okResponse({ error: { code: 'UNAUTHORIZED', message: 'Expired' } }, 401)).mockResolvedValueOnce(okResponse({ ok: true }));
    await expect(apiRequest('/users/me/registrations', { authenticated: true })).resolves.toEqual({ ok: true });
    expect(getCognitoAccessToken).toHaveBeenNthCalledWith(2, true);
    expect(new Headers(vi.mocked(fetch).mock.calls[1][1]?.headers).get('Authorization')).toBe('Bearer refreshed-token');
  });

  it('notifies the auth context after a refreshed token also receives 401', async () => {
    const expired = vi.fn();
    window.addEventListener('eventpulse:auth-expired', expired);
    vi.mocked(getCognitoAccessToken).mockResolvedValueOnce('expired-token').mockResolvedValueOnce('still-invalid-token');
    vi.mocked(fetch).mockResolvedValue(okResponse({ error: { code: 'UNAUTHORIZED', message: 'Invalid session' } }, 401));
    await expect(apiRequest('/users/me/registrations', { authenticated: true })).rejects.toMatchObject({ status: 401 });
    expect(expired).toHaveBeenCalledTimes(1);
    window.removeEventListener('eventpulse:auth-expired', expired);
  });

  it('rejects authenticated requests when no Cognito access token is available', async () => {
    vi.mocked(getCognitoAccessToken).mockRejectedValue(new Error('No active Cognito access token. Sign in and try again.'));
    await expect(apiRequest('/events', { authenticated: true })).rejects.toMatchObject({ status: 401, code: 'AUTHENTICATION_REQUIRED' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('reports missing API configuration clearly', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    await expect(apiRequest('/events')).rejects.toMatchObject({ status: 0, code: 'API_NOT_CONFIGURED' });
  });
});
