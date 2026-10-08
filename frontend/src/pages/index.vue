<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-toolbar-title> CollaDoc </q-toolbar-title>

        <div v-if="auth.user" class="row items-center q-gutter-sm">
          <span>{{ auth.user.displayName }}</span>
          <q-btn flat dense round icon="logout" aria-label="Se déconnecter" @click="onLogout" />
        </div>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();

async function onLogout() {
  await auth.logout();
  await router.push('/login');
}
</script>
