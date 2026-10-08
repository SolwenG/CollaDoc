<template>
  <AuthCard title="Créer un nouvel utilisateur">
    <q-form class="q-gutter-md" @submit="handleCreateUser">
      <q-input
        v-model="formData.username"
        label="Nom d'utilisateur"
        hint="3 à 32 caractères, en minuscules"
        outlined
        dense
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

      <q-select
        v-model="formData.role"
        label="Rôle"
        outlined
        dense
        :options="roleOptions"
        emit-value
        map-options
      />

      <q-banner v-if="errorMessage" class="bg-negative text-white rounded-borders">
        {{ errorMessage }}
      </q-banner>

      <q-banner v-if="successMessage" class="bg-positive text-white rounded-borders">
        {{ successMessage }}
      </q-banner>

      <div class="row q-gutter-sm">
        <q-btn type="button" label="Annuler" color="grey" outline class="col" @click="goBack" />
        <q-btn type="submit" label="Créer" color="primary" class="col" :loading="loading" />
      </div>
    </q-form>
  </AuthCard>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import {
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  maxLength,
  minLength,
  required,
  safeCharacters,
} from '@/utils/validation';
import AuthCard from '@/components/AuthCard.vue';

const router = useRouter();
const userStore = useUserStore();

const formData = reactive({
  username: '',
  role: '' as 'USER' | 'ADMIN',
});

const roleOptions = [
  { label: 'Utilisateur', value: 'USER' },
  { label: 'Administrateur', value: 'ADMIN' },
];

const usernameError = ref('');
const errorMessage = ref('');
const successMessage = ref('');
const loading = ref(false);

async function handleCreateUser() {
  errorMessage.value = '';
  successMessage.value = '';
  usernameError.value = '';
  loading.value = true;

  if (!formData.username.trim()) {
    errorMessage.value = "Le nom d'utilisateur est requis";
    loading.value = false;
    return;
  }
  if (!formData.role) {
    errorMessage.value = 'Le rôle est requis';
    loading.value = false;
    return;
  }

  const result = await userStore.createUser({
    username: formData.username,
    role: formData.role,
  });

  if (result.success) {
    successMessage.value = `Utilisateur créé avec succès. Mot de passe temporaire: ${result.temporaryPassword}`;
    formData.username = '';
    formData.role = 'USER';

    setTimeout(() => {
      void router.push('/admin');
    }, 3000);
  } else {
    if (result.error?.includes('déjà utilisé') || result.error?.includes('already exists')) {
      usernameError.value = result.error || 'Cet identifiant est déjà utilisé.';
    } else {
      errorMessage.value = result.error || "Erreur lors de la création de l'utilisateur";
    }
  }
  loading.value = false;
}

function goBack() {
  void router.push('/admin');
}
</script>
