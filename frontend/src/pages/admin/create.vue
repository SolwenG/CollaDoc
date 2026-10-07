<script setup lang="ts">
import {ref, reactive} from 'vue';
import {useRouter} from 'vue-router';

const router = useRouter();

const formData = reactive({
  username: '',
  passwordHash: '',
  mustChangePassword: true,
});

const errorMessage = ref('');
const successMessage = ref('');
const loading = ref(false);

function handleCreateUser() {
  errorMessage.value = '';
  successMessage.value = '';
  loading.value = true;

  try {
    if (!formData.username.trim()) {
      errorMessage.value = 'Le nom d\'utilisateur est requis';
      return;
    }
    if (!formData.passwordHash.trim()) {
      errorMessage.value = 'Le mot de passe est requis';
      return;
    }

    // TODO: Implement API call to create user
    // For now, simulate user creation
    console.log('Creating user:', formData);

    successMessage.value = 'Utilisateur créé avec succès';

    // Redirect after a short delay
    setTimeout(() => {
      void router.push('/admin');
    }, 1500);
  } catch (error) {
    errorMessage.value = 'Erreur lors de la création de l\'utilisateur';
    console.error('Create user error:', error);
  } finally {
    loading.value = false;
  }
}

function goBack() {
  void router.push('/admin');
}
</script>

<template>
  <q-page padding>
    <div class="q-pa-md" style="max-width: 500px; margin: 0 auto">
      <h1 class="text-h5 q-mb-md">Créer un nouvel utilisateur</h1>

      <q-card>
        <q-card-section>
          <q-form class="q-gutter-md" @submit="handleCreateUser">
            <q-input
              v-model="formData.username"
              label="Nom d'utilisateur"
              outlined
              dense
              :rules="[val => !!val || 'Le nom d\'utilisateur est requis']"
            />

            <q-input
              v-model="formData.passwordHash"
              label="Mot de passe"
              type="password"
              outlined
              dense
              :rules="[val => !!val || 'Le mot de passe est requis']"
            />

            <q-banner v-if="errorMessage" class="bg-negative text-white rounded-borders">
              {{ errorMessage }}
            </q-banner>

            <q-banner v-if="successMessage" class="bg-positive text-white rounded-borders">
              {{ successMessage }}
            </q-banner>

            <div class="row q-gutter-sm">
              <q-btn
                type="button"
                label="Annuler"
                color="grey"
                outline
                class="col"
                @click="goBack"
              />
              <q-btn
                type="submit"
                label="Créer"
                color="primary"
                class="col"
                :loading="loading"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<style scoped>
</style>
