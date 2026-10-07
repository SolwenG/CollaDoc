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

      <q-input
        v-model="formData.passwordHash"
        label="Mot de passe"
        type="password"
        outlined
        dense
        autocomplete="new-password"
        :rules="[
          required,
          minLength(PASSWORD_MIN_LENGTH),
          maxLength(PASSWORD_MAX_LENGTH),
          strongEnough,
        ]"
      />
      <div v-if="formData.passwordHash">
        <q-linear-progress :value="(score + 1) / 5" :color="color" />
        <div class="text-caption">{{ label }}</div>
      </div>

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
import { ref, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { usePasswordStrength } from '@/hooks/usePasswordStrength';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
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
  passwordHash: '',
  role: '' as 'USER' | 'ADMIN',
});

const roleOptions = [
  { label: 'Utilisateur', value: 'USER' },
  { label: 'Administrateur', value: 'ADMIN' },
];

const password = computed(() => formData.passwordHash);
const { score, label, color, strongEnough } = usePasswordStrength(password);

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
  if (!formData.passwordHash.trim()) {
    errorMessage.value = 'Le mot de passe est requis';
    loading.value = false;
    return;
  }

  const result = await userStore.createUser({
    username: formData.username,
    passwordHash: formData.passwordHash,
    displayName: formData.username,
    mustChangePassword: true,
    role: formData.role,
  });

  if (result.success) {
    successMessage.value = 'Utilisateur créé avec succès';
    formData.username = '';
    formData.passwordHash = '';
    formData.role = 'USER';

    setTimeout(() => {
      void router.push('/admin');
    }, 1500);
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
