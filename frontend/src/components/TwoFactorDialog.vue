<template>
  <q-dialog v-model="open" persistent>
    <q-card class="two-factor-card">
      <q-card-section>
        <div class="text-h6">Vérification en deux étapes</div>
      </q-card-section>
      <q-card-section>
        <p>Saisissez le code à 6 chiffres affiché par votre application d'authentification.</p>
        <q-form class="q-gutter-y-md" @submit="onSubmit">
          <q-input
            v-model="code"
            label="Code"
            outlined
            autofocus
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
            <q-btn flat label="Annuler" @click="abort()" />
            <q-btn type="submit" color="primary" label="Vérifier" :loading="loading" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { required, sixDigits } from '@/utils/validation';
import { useAuthStore } from '@/stores/auth';

const open = defineModel<boolean>({ required: true });
const emit = defineEmits<{ verified: [] }>();
const $q = useQuasar();
const auth = useAuthStore();

const code = ref('');
const codeError = ref('');
const loading = ref(false);

// On repart d'un champ vide à chaque ouverture
watch(open, (isOpen) => {
  if (isOpen) {
    code.value = '';
    codeError.value = '';
  }
});

async function abort(message?: string) {
  open.value = false;
  if (message) $q.notify({ type: 'negative', message });
  await auth.logout();
}

async function onSubmit() {
  loading.value = true;
  try {
    const result = await auth.verifyMfa(code.value);
    if (result === 'success') {
      emit('verified');
      return;
    }
    if (result === 'invalid-code') {
      codeError.value = 'Code invalide.';
      return;
    }
    if (result === 'locked') {
      await abort('Trop de tentatives. Réessayez dans quelques minutes.');
      return;
    }
    if (result === 'expired') {
      await abort('Session expirée, reconnectez-vous.');
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
.two-factor-card {
  width: 100%;
  max-width: 400px;
}
</style>
