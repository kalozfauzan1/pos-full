const API_BASE = '/api';

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
  const msg = (data as { error?: string; message?: string }).error
    || (data as { message: string }).message
    || 'Request failed';
  throw new Error(msg);
  }

  return data as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ user: { id: string; email: string; name: string; role: { id: string; name: string; permissions: string[] } } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    ),
  logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),
  refresh: () =>
    request<{ user: { id: string; email: string; name: string; role: { id: string; name: string; permissions: string[] } } }>(
      '/auth/refresh',
      { method: 'POST' }
    ),
};
