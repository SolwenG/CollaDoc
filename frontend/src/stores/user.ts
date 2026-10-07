import { ref } from 'vue';
import { defineStore } from 'pinia';
import { apiFetch, postJson } from '@/utils/api';
import { useAuthStore } from './auth';

export interface User {
  id: number;
  username: string;
  displayName: string;
  passwordHash: string;
  role: 'USER' | 'ADMIN';
  mustChangePassword: boolean;
  blockedAt: string | null;
  blockedById: number | null;
  blockedBy: User | null;
}

export const useUserStore = defineStore('user', () => {
  const currentUser = ref<User | null>(null);

  async function fetchUserProfile(userId: number): Promise<User | null> {
    try {
      const response = await apiFetch(`/profil/${userId}`);
      if (response.status === 200) {
        const userData = (await response.json()) as User;
        currentUser.value = userData;
        return userData;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  async function fetchAllUsers(): Promise<User[]> {
    try {
      const response = await apiFetch('/admin');
      if (response.status === 200) {
        return (await response.json()) as User[];
      }
      return [];
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  async function toggleBlockUser(userId: number, blocked: boolean): Promise<User | null> {
    try {
      const authStore = useAuthStore();
      const body = blocked
        ? {
            blockedAt: new Date().toISOString(),
            blockedById: authStore.user?.id || null,
          }
        : {
            blockedAt: null,
            blockedById: null,
          };
      const response = await postJson(`/users/${userId}/block`, body);
      if (response.status === 200) {
        return (await response.json()) as User;
      }
      return null;
    } catch (error) {
      console.error('Error toggling block status:', error);
      return null;
    }
  }

  async function createUser(data: {
    username: string;
    passwordHash: string;
    displayName: string;
    mustChangePassword: boolean;
    role: 'USER' | 'ADMIN';
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await postJson('/admin/create', data);
      if (response.status === 201) {
        return { success: true };
      }
      const errorData = (await response.json()) as { message?: string };
      return { success: false, error: errorData.message || 'Erreur lors de la création' };
    } catch (error) {
      console.error('Create user error:', error);
      return { success: false, error: 'Erreur lors de la création' };
    }
  }

  async function updateDisplayName(
    newDisplayName: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const authStore = useAuthStore();
      if (!authStore.user) {
        return { success: false, error: "Pas d'utilisateur connecté" };
      }
      const response = await apiFetch(`/profil/${authStore.user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: newDisplayName }),
      });
      if (response.status === 200) {
        if (currentUser.value) {
          currentUser.value.displayName = newDisplayName;
        }
        return { success: true };
      }
      return { success: false, error: 'Erreur lors de la mise à jour' };
    } catch (error) {
      console.error('Failed to update display name:', error);
      return { success: false, error: "Erreur lors de la mise à jour du nom d'affichage" };
    }
  }

  async function updatePassword(
    newPassword: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const authStore = useAuthStore();
      if (!authStore.user) {
        return { success: false, error: "Pas d'utilisateur connecté" };
      }
      const response = await apiFetch(`/profil/${authStore.user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });
      if (response.status === 200) {
        if (currentUser.value) {
          currentUser.value.passwordHash = newPassword;
        }
        return { success: true };
      }
      return { success: false, error: 'Erreur lors de la mise à jour' };
    } catch (error) {
      console.error('Failed to update password:', error);
      return { success: false, error: 'Erreur lors de la mise à jour du mot de passe' };
    }
  }

  return {
    currentUser,
    fetchUserProfile,
    fetchAllUsers,
    toggleBlockUser,
    createUser,
    updateDisplayName,
    updatePassword,
  };
});
