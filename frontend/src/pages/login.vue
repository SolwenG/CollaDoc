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
import AuthCard from '@/components/AuthCard.vue';
import { required } from '@/utils/validation';

const username = ref('');
const password = ref('');
const loading = ref(false);

function onSubmit() {
  console.log('Connexion demandée pour', username.value);
}
</script>
