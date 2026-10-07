import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { apiFetch, postJson } from '@/utils/api';

export interface User {
  id: number;
  username: string;
  displayName: string;
  role: 'USER' | 'ADMIN';
}

const initialized = ref(false);

export type LoginResult =
  'success' | 'mfa-required' | 'invalid' | 'blocked' | 'rate-limited' | 'error';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);

  const isLoggedIn = computed(() => user.value !== null);
  const isAdmin = computed(() => user.value?.role === 'ADMIN');

  async function login(username: string, password: string): Promise<LoginResult> {
    const response = await postJson('/auth/login', { username, password });

    if (response.status === 200) {
      const body = (await response.json()) as { user?: User; mfaRequired?: boolean };

      if (body.mfaRequired) return 'mfa-required';

      if (body.user) {
        user.value = body.user;
        return 'success';
      }
      return 'error';
    }

    if (response.status === 401) return 'invalid';
    if (response.status === 403) return 'blocked';
    if (response.status === 429) return 'rate-limited';
    return 'error';
  }

  async function logout() {
    try {
      await postJson('/auth/logout', {});
    } catch {
      // Serveur injoignable : on déconnecte quand même côté front
    }
    user.value = null;
  }

  async function fetchCurrentUser() {
    try {
      const response = await apiFetch('/auth/session');
      user.value = response.status === 200 ? ((await response.json()) as User) : null;
    } catch {
      user.value = null;
    }
    initialized.value = true;
  }

  return { user, initialized, isLoggedIn, isAdmin, login, logout, fetchCurrentUser };
});
