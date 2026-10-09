export const API_PREFIX = '/api';

// Same format as every error returned by the back (errors.middleware.ts)
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

let unauthorizedHandler: (() => void) | null = null;

// Called when a request outside /auth answers 401: the session has expired
export function onUnauthorized(handler: () => void) {
  unauthorizedHandler = handler;
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_PREFIX}${path}`, options);

  if (response.status === 401 && !path.startsWith('/auth/')) {
    unauthorizedHandler?.();
  }

  return response;
}

export function postJson(path: string, body: unknown) {
  return apiFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// Returns null instead of throwing when the body is not JSON
export async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function readApiError(response: Response): Promise<ApiError | null> {
  const body = await readJson<{ error?: ApiError }>(response);
  return body?.error ?? null;
}
