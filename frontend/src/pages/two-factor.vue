<template>
  <AuthCard title="Vérification en deux étapes">
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
      <q-btn type="submit" color="primary" label="Vérifier" :loading="loading" />
    </q-form>
    <div class="q-mt-md">
      <router-link to="/login">Retour à la connexion</router-link>
    </div>
  </AuthCard>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AuthCard from '@/components/AuthCard.vue';
import { required } from '@/utils/validation';

const code = ref('');
const codeError = ref('');
const loading = ref(false);

const sixDigits = (val: string) => /^\d{6}$/.test(val) || 'Le code contient 6 chiffres';

function onSubmit() {
  // TODO : envoyer le code au back quand l'API 2FA existera
  codeError.value = 'Code invalide (vérification pas encore branchée)';
}
</script>
