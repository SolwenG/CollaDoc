<template>
  <AuthCard title="Connexion">
    <q-form class="q-gutter-y-md" @submit="onSubmit">
      <q-input
        v-model="username"
        label="Identifiant"
        outlined
        lazy-rules
        autocomplete="username"
        :rules="[required]"
      />
      <q-input
        v-model="password"
        label="Mot de passe"
        outlined
        type="password"
        lazy-rules
        autocomplete="current-password"
        :rules="[required]"
      />

      <q-btn type="submit" color="primary" label="Se connecter" :loading="loading" />
    </q-form>
    <div class="q-mt-md">
      Pas encore de compte ?
      <router-link to="/register">Créer un compte</router-link>
    </div>
  </AuthCard>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import AuthCard from '@/components/AuthCard.vue';
import { useAuthStore } from '@/stores/auth';
import { required } from '@/utils/validation';

const $q = useQuasar();
const router = useRouter();
const auth = useAuthStore();

const username = ref('');
const password = ref('');
const loading = ref(false);

async function onSubmit() {
  loading.value = true;
  try {
    const result = await auth.login(username.value.trim().toLowerCase(), password.value);

    if (result === 'success') {
      await router.push('/');
      return;
    }

    if (result === 'invalid') {
      $q.notify({ type: 'negative', message: 'Identifiant ou mot de passe incorrect.' });
      return;
    }

    if (result === 'blocked') {
      $q.notify({
        type: 'negative',
        message: 'Ce compte est bloqué. Contactez un administrateur.',
      });
      return;
    }

    if (result === 'rate-limited') {
      $q.notify({
        type: 'negative',
        message: 'Trop de tentatives. Réessayez dans quelques minutes.',
      });
      return;
    }

    if (result === 'mfa-required') {
      // TODO : ouvrir la fenêtre de saisie du code (branche 2FA)
      $q.notify({ type: 'info', message: 'Vérification en deux étapes requise.' });
      return;
    }

    $q.notify({ type: 'negative', message: 'Une erreur est survenue. Réessayez plus tard.' });
  } catch {
    $q.notify({ type: 'negative', message: 'Impossible de joindre le serveur.' });
  } finally {
    loading.value = false;
  }
}
</script>
