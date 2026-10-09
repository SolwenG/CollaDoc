<template>
  <q-dialog v-model="open" persistent @hide="reset">
    <q-card class="setup-card">
      <q-card-section>
        <div class="text-h6">Activer la vérification en deux étapes</div>
      </q-card-section>

      <q-card-section v-if="!setup">
        <p>Confirmez votre mot de passe pour continuer.</p>
        <q-form class="q-gutter-y-md" @submit="onPasswordSubmit">
          <q-input
            v-model="password"
            label="Mot de passe"
            type="password"
            outlined
            autofocus
            lazy-rules
            autocomplete="current-password"
            :rules="[required]"
            :error="!!passwordError"
            :error-message="passwordError"
            @update:model-value="passwordError = ''"
          />
          <div class="row justify-end q-gutter-sm">
            <q-btn flat label="Annuler" @click="open = false" />
            <q-btn type="submit" color="primary" label="Continuer" :loading="loading" />
          </div>
        </q-form>
      </q-card-section>

      <q-card-section v-else class="q-gutter-y-md">
        <div>1. Scannez ce QR code avec votre application d'authentification.</div>
        <div class="row justify-center">
          <img :src="setup.qrCodeDataUrl" alt="QR code à scanner" class="qr-code" />
        </div>

        <div>Ou saisissez cette clé manuellement :</div>
        <q-input :model-value="setup.secret" outlined dense readonly>
          <template #append>
            <q-btn
              flat
              dense
              round
              icon="content_copy"
              aria-label="Copier la clé"
              @click="copySecret(setup.secret)"
            />
          </template>
        </q-input>

        <div>2. Saisissez le code à 6 chiffres affiché par l'application.</div>
        <q-form class="q-gutter-y-md" @submit="onCodeSubmit">
          <q-input
            v-model="code"
            label="Code"
            outlined
            lazy-rules
            mask="######"
            inputmode="numeric"
            autocomplete="one-time-code"
            :rules="[required, sixDigits]"
            :error="!!codeError"
            :error-message="codeError"
            @update:model-value="codeError = ''"
          />
          <div class="row justify-end q-gutter-sm">
            <q-btn flat label="Annuler" @click="open = false" />
            <q-btn type="submit" color="primary" label="Activer" :loading="loading" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { copyToClipboard, useQuasar } from 'quasar';
import { required, sixDigits } from '@/utils/validation';
import { useAuthStore, type MfaError, type MfaSetup } from '@/stores/auth';

const open = defineModel<boolean>({ required: true });
const emit = defineEmits<{ enabled: [] }>();
const $q = useQuasar();
const auth = useAuthStore();

const password = ref('');
const passwordError = ref('');
const setup = ref<MfaSetup | null>(null);
const code = ref('');
const codeError = ref('');
const loading = ref(false);

async function copySecret(secret: string) {
  try {
    await copyToClipboard(secret);
    $q.notify({ type: 'positive', message: 'Clé copiée.' });
  } catch {
    $q.notify({ type: 'negative', message: 'Copie impossible, sélectionnez la clé à la main.' });
  }
}

function reset() {
  password.value = '';
  passwordError.value = '';
  setup.value = null;
  code.value = '';
  codeError.value = '';
}

function handleMfaError(error: MfaError) {
  if (error === 'already-enabled') {
    $q.notify({ type: 'info', message: 'La vérification en deux étapes est déjà activée.' });
    emit('enabled');
    open.value = false;
    return;
  }
  if (error === 'locked') {
    $q.notify({
      type: 'negative',
      message: 'Trop de tentatives. Réessayez dans quelques minutes.',
    });
    return;
  }
  if (error === 'expired') {
    // The global 401 handler already logged out and redirected
    return;
  }
  $q.notify({ type: 'negative', message: 'Une erreur est survenue. Réessayez plus tard.' });
}

async function onPasswordSubmit() {
  loading.value = true;
  try {
    const result = await auth.startMfaSetup(password.value);
    if (result.status === 'success') {
      password.value = '';
      setup.value = result.setup;
      return;
    }
    if (result.status === 'invalid-password') {
      passwordError.value = 'Mot de passe incorrect.';
      return;
    }
    handleMfaError(result.status);
  } catch {
    $q.notify({ type: 'negative', message: 'Impossible de joindre le serveur.' });
  } finally {
    loading.value = false;
  }
}

async function onCodeSubmit() {
  loading.value = true;
  try {
    const result = await auth.enableMfa(code.value);
    if (result === 'success') {
      $q.notify({ type: 'positive', message: 'Vérification en deux étapes activée.' });
      emit('enabled');
      open.value = false;
      return;
    }
    if (result === 'invalid-code') {
      codeError.value = 'Code invalide.';
      return;
    }
    if (result === 'setup-not-started') {
      setup.value = null;
      code.value = '';
      $q.notify({ type: 'warning', message: 'La configuration a changé, recommencez.' });
      return;
    }
    handleMfaError(result);
  } catch {
    $q.notify({ type: 'negative', message: 'Impossible de joindre le serveur.' });
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.setup-card {
  width: 100%;
  max-width: 420px;
}

.qr-code {
  width: 180px;
  image-rendering: pixelated;
}
</style>
