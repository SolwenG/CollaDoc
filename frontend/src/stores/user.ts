import { ref } from 'vue';
import { defineStore } from 'pinia';
import { apiFetch, postJson, readJson, readApiError } from '@/utils/api';
import { useAuthStore } from './auth';

// Common fields for profile and admin views
export interface UserProfile {
  id: number;
  username: string;
  displayName: string;
  role: 'USER' | 'ADMIN';
  mfaEnabled: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

// Admin view includes blocking info
export interface AdminUserView extends UserProfile {
  blockedAt: string | null;
  blockedBy: { id: number; username: string; displayName: string } | null;
}

// Response wrappers
interface ProfileResponse {
  profile: UserProfile;
}

interface UsersListResponse {
  users: AdminUserView[];
  page: number;
  pageSize: number;
  total: number;
}

interface UserResponse {
  user: AdminUserView;
}

interface CreateUserResponse {
  user: AdminUserView;
  temporaryPassword: string;
}

export const useUserStore = defineStore('user', () => {
  const currentUser = ref<UserProfile | null>(null);

  async function fetchUserProfile(userId: number): Promise<UserProfile | null> {
    try {
      const response = await apiFetch(`/profile/${userId}`);
      if (response.status === 200) {
        const body = await readJson<ProfileResponse>(response);
        if (body?.profile) {
          currentUser.value = body.profile;
          return body.profile;
        }
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  async function fetchAllUsers(params?: { page?: number; pageSize?: number; search?: string }): Promise<UsersListResponse | null> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
      if (params?.search) queryParams.append('search', params.search);
      
      const url = queryParams.toString() ? `/admin/users?${queryParams.toString()}` : '/admin/users';
      const response = await apiFetch(url);
      if (response.status === 200) {
        return await readJson<UsersListResponse>(response);
      }
      return null;
    } catch (error) {
      console.error('Error fetching users:', error);
      return null;
    }
  }

  async function toggleBlockUser(userId: number, blocked: boolean): Promise<AdminUserView | null> {
    try {
      const endpoint = blocked ? `/admin/users/${userId}/block` : `/admin/users/${userId}/unblock`;
      const response = await postJson(endpoint, {});
      if (response.status === 200) {
        const body = await readJson<UserResponse>(response);
        return body?.user ?? null;
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
        const result = await readJson<CreateUserResponse>(response);
        if (result?.temporaryPassword) {
          return { success: true, temporaryPassword: result.temporaryPassword };
        }
        return { success: true };
      }
      const error = await readApiError(response);
      return { success: false, error: error?.message || 'Erreur lors de la création' };
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
        const body = await readJson<ProfileResponse>(response);
        if (body?.profile) {
          currentUser.value = body.profile;
          // Also update authStore user displayName
          const authStore = useAuthStore();
          if (authStore.user) {
            authStore.user.displayName = body.profile.displayName;
          }
        }
        return { success: true };
      }
      const error = await readApiError(response);
      return { success: false, error: error?.message || 'Erreur lors de la mise à jour' };
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
      const error = await readApiError(response);
      return { success: false, error: error?.message || 'Erreur lors de la mise à jour' };
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
