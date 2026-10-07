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
            <q-btn flat label="Annuler" @click="open = false" />
            <q-btn type="submit" color="primary" label="Vérifier" :loading="loading" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { required } from '@/utils/validation';

const open = defineModel<boolean>({ required: true });

const code = ref('');
const codeError = ref('');
const loading = ref(false);

const sixDigits = (val: string) => /^\d{6}$/.test(val) || 'Le code contient 6 chiffres';

// On repart d'un champ vide à chaque ouverture
watch(open, (isOpen) => {
  if (isOpen) {
    code.value = '';
    codeError.value = '';
  }
});

function onSubmit() {
  // TODO : envoyer le code au back quand l'API 2FA existera
  codeError.value = 'Code invalide (vérification pas encore branchée)';
}
</script>

<style scoped>
.two-factor-card {
  width: 100%;
  max-width: 400px;
}
</style>
