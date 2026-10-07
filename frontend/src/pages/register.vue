<template>
  <AuthCard title="Créer un compte">
    <q-form class="q-gutter-y-md" @submit="onSubmit">
      <q-input
        v-model="username"
        label="Identifiant"
        hint="3 à 32 caractères, en minuscules"
        outlined
        lazy-rules
        autocomplete="username"
        :rules="[
          required,
          minLength(USERNAME_MIN_LENGTH),
          maxLength(USERNAME_MAX_LENGTH),
          safeCharacters,
        ]"
        :error="!!usernameError"
        :error-message="usernameError"
        @update:model-value="usernameError = ''"
      />
      <q-input
        v-model="displayName"
        label="Nom d'affichage"
        hint="Le nom que les autres verront, 2 à 50 caractères, en minuscules"
        outlined
        lazy-rules
        autocomplete="off"
        :rules="[
          required,
          minLength(DISPLAY_NAME_MIN_LENGTH),
          maxLength(DISPLAY_NAME_MAX_LENGTH),
          safeCharacters,
        ]"
      />
      <q-input
        v-model="password"
        label="Mot de passe"
        outlined
        type="password"
        lazy-rules
        autocomplete="new-password"
        :rules="[
          required,
          minLength(PASSWORD_MIN_LENGTH),
          maxLength(PASSWORD_MAX_LENGTH),
          strongEnough,
        ]"
      />
      <div v-if="password">
        <q-linear-progress :value="(score + 1) / 5" :color="color" />
        <div class="text-caption">{{ label }}</div>
      </div>
      <q-input
        v-model="confirmPassword"
        label="Confirmer le mot de passe"
        outlined
        type="password"
        lazy-rules
        autocomplete="new-password"
        :rules="[required, samePassword]"
      />

      <q-btn type="submit" color="primary" label="S'inscrire" :loading="loading" />
    </q-form>
    <div class="q-mt-md">
      Déjà un compte ?
      <router-link to="/login">Se connecter</router-link>
    </div>
  </AuthCard>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import AuthCard from '@/components/AuthCard.vue';
import { usePasswordStrength } from '@/composables/usePasswordStrength';
import { postJson } from '@/utils/api';
import {
  DISPLAY_NAME_MIN_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  maxLength,
  minLength,
  required,
  safeCharacters,
} from '@/utils/validation';

const $q = useQuasar();
const router = useRouter();

const username = ref('');
const displayName = ref('');
const password = ref('');
const confirmPassword = ref('');
const usernameError = ref('');
const loading = ref(false);

const { score, label, color, strongEnough } = usePasswordStrength(password);

const samePassword = (val: string) =>
  val === password.value || 'Les mots de passe ne correspondent pas';

async function onSubmit() {
  loading.value = true;
  try {
    const response = await postJson('/auth/register', {
      username: username.value.trim(),
      displayName: displayName.value.trim(),
      password: password.value,
    });

    if (response.status === 201) {
      $q.notify({ type: 'positive', message: 'Compte créé, vous pouvez vous connecter.' });
      await router.push('/login');
      return;
    }

    if (response.status === 409) {
      usernameError.value = 'Cet identifiant est déjà utilisé.';
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
