import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { postJson } from '@/utils/api';

export interface User {
  id: number;
  username: string;
  displayName: string;
  role: 'USER' | 'ADMIN';
}

export type LoginResult = 'success' | 'invalid' | 'blocked' | 'error';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);

  const isLoggedIn = computed(() => user.value !== null);
  const isAdmin = computed(() => user.value?.role === 'ADMIN');

  async function login(username: string, password: string): Promise<LoginResult> {
    const response = await postJson('/auth/login', { username, password });

    if (response.status === 200) {
      user.value = (await response.json()) as User;
      return 'success';
    }
    if (response.status === 401) return 'invalid';
    if (response.status === 403) return 'blocked';
    return 'error';
  }

  return { user, isLoggedIn, isAdmin, login };
});
