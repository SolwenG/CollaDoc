import { apiFetch, postJson, readApiError, readJson } from '@/utils/api';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export interface User {
  id: number;
  username: string;
  displayName: string;
  role: 'USER' | 'ADMIN';
}

export type LoginResult =
  'success' | 'mfa-required' | 'invalid' | 'blocked' | 'rate-limited' | 'error';

export interface MfaSetup {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

export type MfaError =
  | 'invalid-password'
  | 'invalid-code'
  | 'already-enabled'
  | 'setup-not-started'
  | 'locked'
  | 'expired'
  | 'error';

export type MfaSetupResult = { status: 'success'; setup: MfaSetup } | { status: MfaError };

const LOGIN_ERRORS: Record<string, LoginResult> = {
  INVALID_CREDENTIALS: 'invalid',
  ACCOUNT_BLOCKED: 'blocked',
  TOO_MANY_ATTEMPTS: 'rate-limited',
};

const MFA_ERRORS: Record<string, MfaError> = {
  INVALID_CURRENT_PASSWORD: 'invalid-password',
  INVALID_MFA_CODE: 'invalid-code',
  MFA_ALREADY_ENABLED: 'already-enabled',
  MFA_SETUP_NOT_STARTED: 'setup-not-started',
  TOO_MANY_ATTEMPTS: 'locked',
  UNAUTHENTICATED: 'expired',
};

async function toMfaError(response: Response): Promise<MfaError> {
  const error = await readApiError(response);
  return (error && MFA_ERRORS[error.code]) ?? 'error';
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const initialized = ref(false);

  const isLoggedIn = computed(() => user.value !== null);
  const isAdmin = computed(() => user.value?.role === 'ADMIN');

  async function login(username: string, password: string): Promise<LoginResult> {
    const response = await postJson('/auth/login', { username, password });

    if (response.ok) {
      const body = await readJson<{ user?: User; mfaRequired?: boolean }>(response);

      if (body?.mfaRequired) return 'mfa-required';

      if (body?.user) {
        user.value = body.user;
        return 'success';
      }
      return 'error';
    }

    const error = await readApiError(response);
    return (error && LOGIN_ERRORS[error.code]) ?? 'error';
  }

  async function logout() {
    try {
      await postJson('/auth/logout', {});
    } catch {
      // Server unreachable: log out on the front anyway
    }
    user.value = null;
  }

  async function fetchCurrentUser() {
    try {
      const response = await apiFetch('/auth/session');
      const body = response.ok ? await readJson<{ user?: User }>(response) : null;
      user.value = body?.user ?? null;
    } catch {
      user.value = null;
    }
    initialized.value = true;
  }

  function forgetUser() {
    user.value = null;
  }

  async function startMfaSetup(password: string): Promise<MfaSetupResult> {
    const response = await postJson('/auth/mfa/setup', { password });
    if (response.ok) {
      const setup = await readJson<MfaSetup>(response);
      return setup ? { status: 'success', setup } : { status: 'error' };
    }
    return { status: await toMfaError(response) };
  }

  async function enableMfa(code: string): Promise<'success' | MfaError> {
    const response = await postJson('/auth/mfa/enable', { code });
    return response.ok ? 'success' : toMfaError(response);
  }

  async function verifyMfa(code: string): Promise<'success' | MfaError> {
    const response = await postJson('/auth/mfa/verify', { code });
    if (response.ok) {
      const body = await readJson<{ user?: User }>(response);
      if (body?.user) {
        user.value = body.user;
        return 'success';
      }
      return 'error';
    }
    return toMfaError(response);
  }

  return {
    user,
    initialized,
    isLoggedIn,
    isAdmin,
    login,
    logout,
    fetchCurrentUser,
    forgetUser,
    startMfaSetup,
    enableMfa,
    verifyMfa,
  };
});
