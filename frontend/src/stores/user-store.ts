import {defineStore} from 'pinia';

export interface User {
  id: number;
  displayName: string;
  passwordHash: string;
}

export const useUserStore = defineStore('user', {
  state: () => ({
    currentUser: null as User | null,
  }),

  actions: {
    updateDisplayName(newDisplayName: string): { success: boolean; error?: string } {
      // TODO: Implement API call to update display name
      try {
        if (this.currentUser) {
          this.currentUser.displayName = newDisplayName;
          return {success: true};
        }
        return {success: false, error: "Pas d'utilisateur connecté"};
      } catch (error) {
        console.error('Failed to update display name:', error);
        return {success: false, error: "Erreur lors de la mise à jour du nom d'affichage"};
      }
    },

    updatePassword(newPassword: string): { success: boolean; error?: string } {
      // TODO: Implement API call to update password
      try {
        if (this.currentUser) {
          this.currentUser.passwordHash = newPassword;
          return {success: true};
        }
        return {success: false, error: "Pas d'utilisateur connecté"};
      } catch (error) {
        console.error('Failed to update password:', error);
        return {success: false, error: "Erreur lors de la mise à jour du mot de passe"};
      }
    },
  },
});
