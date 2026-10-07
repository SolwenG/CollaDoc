<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore, type User } from '@/stores/user-store';

const router = useRouter();
const userStore = useUserStore();

// Mock data - TODO: Replace with actual API call to fetch users
const users = ref<User[]>([
  {
    id: 1,
    username: 'alice',
    displayName: 'Alice Dupont',
    passwordHash: 'hash1',
    role: 'USER',
    mustChangePassword: false,
    blockedAt: null,
    blockedById: null,
    blockedBy: null,
  },
  {
    id: 2,
    username: 'bob',
    displayName: 'Bob Martin',
    passwordHash: 'hash2',
    role: 'USER',
    mustChangePassword: true,
    blockedAt: null,
    blockedById: null,
    blockedBy: null,
  },
  {
    id: 3,
    username: 'charlie',
    displayName: 'Charlie Durand',
    passwordHash: 'hash3',
    role: 'USER',
    mustChangePassword: false,
    blockedAt: '2024-01-15T10:30:00Z',
    blockedById: 1,
    blockedBy: null,
  },
]);

function isUserBlocked(user: User): boolean {
  return user.blockedAt !== null;
}

function toggleBlockUser(user: User) {
  if (isUserBlocked(user)) {
    // Unblock user
    user.blockedAt = null;
    user.blockedById = null;
    user.blockedBy = null;
  } else {
    // Block user
    user.blockedAt = new Date().toISOString();
    if (userStore.currentUser) {
      user.blockedById = userStore.currentUser.id;
      user.blockedBy = userStore.currentUser;
    }
  }
  // TODO: Call API to persist the change
}

function goToNewUser() {
  void router.push('/admin/create');
}
</script>

<template>
  <q-page padding>
    <div class="q-pa-md" style="max-width: 800px; margin: 0 auto">
      <div class="row items-center justify-between q-mb-md">
        <h1 class="text-h5 q-ma-none">Liste des utilisateurs</h1>
        <q-btn label="Créer un nouvel utilisateur" color="primary" @click="goToNewUser" />
      </div>

      <q-card>
        <q-list separator>
          <q-item v-for="user in users" :key="user.id">
            <q-item-section avatar>
              <q-icon name="person" />
            </q-item-section>

            <q-item-section>
              <q-item-label>{{ user.displayName }}</q-item-label>
              <q-item-label caption>@{{ user.username }}</q-item-label>
            </q-item-section>

            <q-item-section side>
              <q-btn
                :icon="isUserBlocked(user) ? 'block' : 'block'"
                :color="isUserBlocked(user) ? 'negative' : 'grey'"
                flat
                round
                @click="toggleBlockUser(user)"
              >
                <q-tooltip>
                  {{ isUserBlocked(user) ? "Débloquer l'utilisateur" : "Bloquer l'utilisateur" }}
                </q-tooltip>
              </q-btn>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card>
    </div>
  </q-page>
</template>

<style scoped></style>
