<template>
  <q-page padding>
    <div class="q-pa-md" style="max-width: 600px; margin: 0 auto">
      <h1 class="text-h5 q-mb-md text-center">Mon profil</h1>

      <q-card class="q-mb-md">
        <q-card-section>
          <q-form class="q-gutter-md">
            <!-- Display Name Section -->
            <h2 class="text-h6 q-mt-md q-mb-sm">Modifier mon nom d'affichage</h2>
            <!-- Display Name Field -->
            <div class="row items-center q-gutter-sm">
              <div class="col">
                <q-input
                  v-model="formData.displayName"
                  label="Nom d'affichage"
                  hint="Le nom que les autres voient, 2 à 50 caractères"
                  :disable="!editing.displayName"
                  outlined
                  dense
                  lazy-rules
                  autocomplete="off"
                  :rules="[
                    required,
                    minLength(DISPLAY_NAME_MIN_LENGTH),
                    maxLength(DISPLAY_NAME_MAX_LENGTH),
                  ]"
                  :error="!!displayNameError"
                  :error-message="displayNameError"
                  @update:model-value="displayNameError = ''"
                />
              </div>
              <q-btn
                v-if="!editing.displayName"
                icon="edit"
                flat
                round
                color="grey"
                @click="toggleEdit('displayName')"
              />
              <template v-else>
                <q-btn
                  icon="close"
                  flat
                  round
                  color="negative"
                  @click="cancelEdit('displayName')"
                />
                <q-btn
                  icon="check"
                  flat
                  round
                  color="positive"
                  @click="toggleEdit('displayName')"
                />
              </template>
            </div>

            <!-- Password Section -->
            <h2 class="text-h6 q-mt-md q-mb-sm">Modifier mon mot de passe</h2>
            <!-- Password Field -->
            <div class="row items-center q-gutter-sm">
              <div class="col">
                <q-input
                  v-if="editing.password"
                  v-model="formData.currentPassword"
                  label="Mot de passe actuel"
                  :type="showCurrentPassword ? 'text' : 'password'"
                  outlined
                  dense
                  autocomplete="current-password"
                  :rules="[required]"
                  :error="!!currentPasswordError"
                  :error-message="currentPasswordError"
                  @update:model-value="currentPasswordError = ''"
                >
                  <template #append>
                    <q-icon
                      :name="showCurrentPassword ? 'visibility_off' : 'visibility'"
                      class="cursor-pointer"
                      @click="showCurrentPassword = !showCurrentPassword"
                    />
                  </template>
                </q-input>
                <q-input
                  v-model="formData.password"
                  label="Nouveau mot de passe"
                  :type="showPassword ? 'text' : 'password'"
                  :disable="!editing.password"
                  outlined
                  dense
                  autocomplete="new-password"
                  :rules="[
                    required,
                    minLength(PASSWORD_MIN_LENGTH),
                    maxLength(PASSWORD_MAX_LENGTH),
                    strongEnough,
                  ]"
                  :error="!!passwordError"
                  :error-message="passwordError"
                  @update:model-value="passwordError = ''"
                >
                  <template #append>
                    <q-icon
                      :name="showPassword ? 'visibility_off' : 'visibility'"
                      class="cursor-pointer"
                      @click="showPassword = !showPassword"
                    />
                  </template>
                </q-input>
                <q-input
                  v-if="editing.password"
                  v-model="formData.confirmPassword"
                  label="Confirmer le nouveau mot de passe"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  :disable="!editing.password"
                  outlined
                  dense
                  autocomplete="new-password"
                  :rules="[required, passwordsMatch]"
                  :error="!!confirmPasswordError"
                  :error-message="confirmPasswordError"
                  @update:model-value="confirmPasswordError = ''"
                >
                  <template #append>
                    <q-icon
                      :name="showConfirmPassword ? 'visibility_off' : 'visibility'"
                      class="cursor-pointer"
                      @click="showConfirmPassword = !showConfirmPassword"
                    />
                  </template>
                </q-input>
                <div v-if="formData.password && editing.password">
                  <q-linear-progress :value="(score + 1) / 5" :color="color" />
                  <div class="text-caption">{{ label }}</div>
                </div>
              </div>
              <q-btn
                v-if="!editing.password"
                icon="edit"
                flat
                round
                color="grey"
                @click="toggleEdit('password')"
              />
              <template v-else>
                <q-btn icon="close" flat round color="negative" @click="cancelEdit('password')" />
                <q-btn icon="check" flat round color="positive" @click="toggleEdit('password')" />
              </template>
            </div>

            <!-- Error Message -->
            <q-banner v-if="errorMessage" class="bg-negative text-white rounded-borders">
              {{ errorMessage }}
            </q-banner>

            <!-- Success Message -->
            <q-banner v-if="successMessage" class="bg-positive text-white rounded-borders">
              {{ successMessage }}
            </q-banner>
          </q-form>
        </q-card-section>
      </q-card>

      <!-- MFA Configuration Button -->
      <q-btn
        label="Configuration MFA"
        color="primary"
        class="full-width q-mt-lg"
        @click="goToMfaSetup"
      />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useAuthStore } from '@/stores/auth';
import { usePasswordStrength } from '@/hooks/usePasswordStrength';
import {
  DISPLAY_NAME_MAX_LENGTH,
  DISPLAY_NAME_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  maxLength,
  minLength,
  required,
} from '@/utils/validation';

const router = useRouter();
const userStore = useUserStore();
const authStore = useAuthStore();

const editing = reactive({
  displayName: false,
  password: false,
});

const formData = reactive({
  displayName: '',
  password: '',
  confirmPassword: '',
  currentPassword: '',
});

const originalFormData = reactive({
  displayName: '',
  password: '',
  confirmPassword: '',
  currentPassword: '',
});

const showPassword = ref(false);
const showConfirmPassword = ref(false);
const showCurrentPassword = ref(false);
const displayNameError = ref('');
const passwordError = ref('');
const confirmPasswordError = ref('');
const currentPasswordError = ref('');
const errorMessage = ref('');
const successMessage = ref('');

const password = computed(() => formData.password);
const { score, label, color, strongEnough } = usePasswordStrength(password);

const passwordsMatch = () => {
  return formData.password === formData.confirmPassword || 'Les mots de passe ne correspondent pas';
};

onMounted(async () => {
  if (authStore.user) {
    const userData = await userStore.fetchUserProfile(authStore.user.id);
    if (userData) {
      formData.displayName = userData.displayName;
      originalFormData.displayName = userData.displayName;
    }
  }
});

async function toggleEdit(field: 'displayName' | 'password') {
  if (editing[field]) {
    // Save changes
    await saveField(field);
  } else {
    // Enable editing
    editing[field] = true;
    errorMessage.value = '';
    successMessage.value = '';
    displayNameError.value = '';
    passwordError.value = '';
    confirmPasswordError.value = '';
    currentPasswordError.value = '';
    formData.password = '';
    formData.confirmPassword = '';
    formData.currentPassword = '';
    originalFormData[field] = formData[field];
  }
}

function cancelEdit(field: 'displayName' | 'password') {
  editing[field] = false;
  errorMessage.value = '';
  successMessage.value = '';
  displayNameError.value = '';
  passwordError.value = '';
  confirmPasswordError.value = '';
  currentPasswordError.value = '';
  formData[field] = originalFormData[field];
  formData.password = '';
  formData.confirmPassword = '';
  formData.currentPassword = '';
}

async function saveField(field: 'displayName' | 'password') {
  errorMessage.value = '';
  successMessage.value = '';
  displayNameError.value = '';
  passwordError.value = '';
  confirmPasswordError.value = '';
  currentPasswordError.value = '';

  if (field === 'displayName') {
    if (!formData.displayName.trim()) {
      displayNameError.value = "Le nom d'affichage ne peut pas être vide";
      return;
    }
    const result = await userStore.updateDisplayName(formData.displayName);
    if (result.success) {
      successMessage.value = "Nom d'affichage mis à jour avec succès";
      editing.displayName = false;
      originalFormData.displayName = formData.displayName;
    } else {
      displayNameError.value = result.error || 'Erreur lors de la mise à jour';
    }
  } else if (field === 'password') {
    if (!formData.currentPassword.trim()) {
      currentPasswordError.value = 'Le mot de passe actuel est requis';
      return;
    }
    if (!formData.password.trim()) {
      passwordError.value = 'Le nouveau mot de passe ne peut pas être vide';
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      confirmPasswordError.value = 'Les mots de passe ne correspondent pas';
      return;
    }
    const result = await userStore.updatePassword(formData.currentPassword, formData.password);
    if (result.success) {
      successMessage.value = 'Mot de passe mis à jour avec succès';
      formData.password = '';
      formData.confirmPassword = '';
      formData.currentPassword = '';
      editing.password = false;
    } else {
      if (result.error?.includes('actuel')) {
        currentPasswordError.value = result.error || 'Erreur lors de la mise à jour';
      } else {
        passwordError.value = result.error || 'Erreur lors de la mise à jour';
      }
    }
  }
}

async function goToMfaSetup() {
  await router.push('/mfa-setup');
}
</script>
