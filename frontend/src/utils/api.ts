const API_PREFIX = '/api';

export function apiFetch(path: string, options: RequestInit = {}) {
  return fetch(`${API_PREFIX}${path}`, options);
}

export function postJson(path: string, body: unknown) {
  return apiFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
