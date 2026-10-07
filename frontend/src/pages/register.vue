<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <q-page class="flex flex-center q-pa-md">
        <q-card class="auth-card">
          <q-card-section>
            <div class="text-h5">CollaDoc</div>
            <div class="text-subtitle1">Créer un compte</div>
          </q-card-section>
          <q-card-section>
            <q-form class="q-gutter-y-md" @submit="onSubmit">
              <q-input
                v-model="username"
                label="Identifiant"
                hint="3 à 32 caractères, en minuscules"
                outlined
                lazy-rules
                :rules="[
                  required,
                  minLength(USERNAME_MIN_LENGTH),
                  maxLength(USERNAME_MAX_LENGTH),
                  usernameFormat,
                ]"
                :error="!!usernameError"
                :error-message="usernameError"
                @update:model-value="usernameError = ''"
              />
              <q-input
                v-model="displayName"
                label="Nom d'affichage"
                outlined
                lazy-rules
                :rules="[required, maxLength(DISPLAY_NAME_MAX_LENGTH)]"
              />
              <q-input
                v-model="password"
                label="Mot de passe"
                outlined
                type="password"
                lazy-rules
                :rules="[
                  required,
                  minLength(PASSWORD_MIN_LENGTH),
                  maxLength(PASSWORD_MAX_LENGTH),
                  strongEnough,
                ]"
              />
              <div v-if="password">
                <q-linear-progress
                  :value="(strength.score + 1) / 5"
                  :color="strengthColors[strength.score]"
                />
                <div class="text-caption">{{ strengthLabels[strength.score] }}</div>
              </div>
              <q-input
                v-model="confirmPassword"
                label="Confirmer le mot de passe"
                outlined
                type="password"
                lazy-rules
                :rules="[required, samePassword]"
              />

              <q-btn type="submit" color="primary" label="S'inscrire" :loading="loading" />
            </q-form>
            <div class="q-mt-md">
              Déjà un compte ?
              <router-link to="/login">Se connecter</router-link>
            </div>
          </q-card-section>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ZxcvbnFactory } from '@zxcvbn-ts/core';
import * as zxcvbnCommon from '@zxcvbn-ts/language-common';
import * as zxcvbnFr from '@zxcvbn-ts/language-fr';
import { useQuasar } from 'quasar';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

const $q = useQuasar();
const router = useRouter();

const zxcvbn = new ZxcvbnFactory({
  translations: zxcvbnFr.translations,
  graphs: zxcvbnCommon.adjacencyGraphs,
  dictionary: {
    ...zxcvbnCommon.dictionary,
    ...zxcvbnFr.dictionary,
  },
});

// Limites identiques à celles du schéma de validation du back
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 32;
const DISPLAY_NAME_MAX_LENGTH = 64;
const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_LENGTH = 128;

const MIN_SCORE = 3;
const strengthLabels = ['Très faible', 'Faible', 'Moyen', 'Bon', 'Excellent'];
const strengthColors = ['negative', 'negative', 'warning', 'positive', 'positive'];

const username = ref('');
const displayName = ref('');
const password = ref('');
const confirmPassword = ref('');
const usernameError = ref('');
const loading = ref(false);

const strength = computed(() => zxcvbn.check(password.value));

const required = (val: string) => !!val.trim() || 'Ce champ est obligatoire';

const minLength = (min: number) => (val: string) =>
  val.length >= min || `${min} caractères minimum`;

const maxLength = (max: number) => (val: string) =>
  val.length <= max || `${max} caractères maximum`;

const usernameFormat = (val: string) =>
  /^[a-z0-9_.-]+$/.test(val) || 'Minuscules, chiffres, point, tiret et underscore uniquement';

const strongEnough = () =>
  strength.value.score >= MIN_SCORE || 'Mot de passe trop facile à deviner';

const samePassword = (val: string) =>
  val === password.value || 'Les mots de passe ne correspondent pas';

async function onSubmit() {
  loading.value = true;
  try {
    const response = await fetch('/api/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.value.trim(),
        displayName: displayName.value.trim(),
        password: password.value,
      }),
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

<style scoped>
.auth-card {
  width: 100%;
  max-width: 400px;
}
</style>
