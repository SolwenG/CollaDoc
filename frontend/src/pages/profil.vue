<template>
  <q-page padding>
    <div class="q-pa-md" style="max-width: 600px; margin: 0 auto">
      <h1 class="text-h5 q-mb-md text-center">Mon profil</h1>

      <q-card class="q-mb-md">
        <q-card-section>
          <q-form class="q-gutter-md">
            <!-- Display Name Field -->
            <div class="row items-center q-gutter-sm">
              <div class="col">
                <q-input
                  v-model="formData.displayName"
                  label="Nom d'affichage"
                  :disable="!editing.displayName"
                  outlined
                  dense
                />
              </div>
              <q-btn
                :icon="editing.displayName ? 'check' : 'edit'"
                flat
                round
                :color="editing.displayName ? 'positive' : 'grey'"
                @click="toggleEdit('displayName')"
              />
            </div>

            <!-- Password Field -->
            <div class="row items-center q-gutter-sm">
              <div class="col">
                <q-input
                  v-model="formData.password"
                  label="Mot de passe"
                  :type="showPassword ? 'text' : 'password'"
                  :disable="!editing.password"
                  outlined
                  dense
                >
                  <template #append>
                    <q-icon
                      :name="showPassword ? 'visibility_off' : 'visibility'"
                      class="cursor-pointer"
                      @click="showPassword = !showPassword"
                    />
                  </template>
                </q-input>
              </div>
              <q-btn
                :icon="editing.password ? 'check' : 'edit'"
                flat
                round
                :color="editing.password ? 'positive' : 'grey'"
                @click="toggleEdit('password')"
              />
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
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user-store';

const router = useRouter();
const userStore = useUserStore();

const editing = reactive({
  displayName: false,
  password: false,
});

const formData = reactive({
  displayName: '',
  password: '',
});

const showPassword = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

onMounted(() => {
  if (userStore.currentUser) {
    formData.displayName = userStore.currentUser.displayName;
  }
});

function toggleEdit(field: 'displayName' | 'password') {
  if (editing[field]) {
    // Save changes
    saveField(field);
  } else {
    // Enable editing
    editing[field] = true;
    errorMessage.value = '';
    successMessage.value = '';
  }
}

function saveField(field: 'displayName' | 'password') {
  errorMessage.value = '';
  successMessage.value = '';

  if (field === 'displayName') {
    if (!formData.displayName.trim()) {
      errorMessage.value = "Le nom d'affichage ne peut pas être vide";
      return;
    }
    const result = userStore.updateDisplayName(formData.displayName);
    if (result.success) {
      successMessage.value = "Nom d'affichage mis à jour avec succès";
      editing.displayName = false;
    } else {
      errorMessage.value = result.error || 'Erreur lors de la mise à jour';
    }
  } else if (field === 'password') {
    if (!formData.password.trim()) {
      errorMessage.value = 'Le mot de passe ne peut pas être vide';
      return;
    }
    const result = userStore.updatePassword(formData.password);
    if (result.success) {
      successMessage.value = 'Mot de passe mis à jour avec succès';
      formData.password = '';
      editing.password = false;
    } else {
      errorMessage.value = result.error || 'Erreur lors de la mise à jour';
    }
  }
}

async function goToMfaSetup() {
  await router.push('/mfa-setup');
}
</script>
