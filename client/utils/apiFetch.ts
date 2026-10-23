import { getSessionToken, removeSessionToken } from './sessionToken';
const expiredListeners = new Set<() => void>();

export function onSessionExpired(listener: () => void): () => void {
  expiredListeners.add(listener);
  return () => { expiredListeners.delete(listener); };
}

/** Adds the login credential only to this app's API requests. */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const base = process.env.EXPO_PUBLIC_BACKEND_BASE_URL?.replace(/\/+$/, '');
  const url = typeof input === 'string' ? input : input.toString();
  if (!base || !url.startsWith(`${base}/api/v1/`)) return fetch(input, init);

  const token = await getSessionToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(input, { ...init, headers });
  if (response.status === 401 && token) {
    await removeSessionToken();
    expiredListeners.forEach(listener => listener());
  }
  return response;
}
