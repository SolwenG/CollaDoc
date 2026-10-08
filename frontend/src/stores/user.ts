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
      const response = await apiFetch(`/profile/${userId}`);
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
      const response = await apiFetch('/admin/users');
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
      const endpoint = blocked ? `/admin/users/${userId}/block` : `/admin/users/${userId}/unblock`;
      const response = await postJson(endpoint, {});
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
    role: 'USER' | 'ADMIN';
  }): Promise<{ success: boolean; error?: string; temporaryPassword?: string }> {
    try {
      const response = await postJson('/admin/users', data);
      if (response.status === 201) {
        const result = (await response.json()) as { user: User; temporaryPassword: string };
        return { success: true, temporaryPassword: result.temporaryPassword };
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
      const response = await apiFetch('/profile', {
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
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const authStore = useAuthStore();
      if (!authStore.user) {
        return { success: false, error: "Pas d'utilisateur connecté" };
      }
      const response = await apiFetch('/profile/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (response.status === 204) {
        return { success: true };
      }
      const errorData = (await response.json()) as { message?: string };
      return { success: false, error: errorData.message || 'Erreur lors de la mise à jour' };
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
