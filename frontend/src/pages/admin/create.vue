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

            <q-banner
                v-if="errorMessage"
                class="bg-negative text-white rounded-borders"
            >
                {{ errorMessage }}
            </q-banner>

            <q-banner
                v-if="successMessage"
                class="bg-positive text-white rounded-borders"
            >
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
    </AuthCard>

    <q-dialog v-model="showPasswordDialog">
        <q-card>
            <q-card-section>
                <div class="text-h6">Mot de passe temporaire</div>
            </q-card-section>

            <q-card-section>
                <p>
                    Utilisateur {{ createdUsername }} créé avec succès. Voici le
                    mot de passe temporaire :
                </p>
                <q-input v-model="temporaryPassword" readonly outlined dense>
                    <template #append>
                        <q-btn
                            icon="content_copy"
                            flat
                            round
                            @click="copyPassword"
                        >
                            <q-tooltip>Copier</q-tooltip>
                        </q-btn>
                    </template>
                </q-input>
                <p class="text-caption text-negative">
                    Ce mot de passe ne sera affiché qu'une seule fois. Copiez-le
                    maintenant.
                </p>
            </q-card-section>

            <q-card-actions align="right">
                <q-btn
                    flat
                    label="Fermer"
                    color="grey"
                    @click="closePasswordDialog"
                />
                <q-btn
                    flat
                    label="Retour"
                    color="primary"
                    @click="closeAndGoBack"
                />
            </q-card-actions>
        </q-card>
    </q-dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import {
    USERNAME_MAX_LENGTH,
    USERNAME_MIN_LENGTH,
    maxLength,
    minLength,
    required,
    safeCharacters,
} from '@/utils/validation'
import AuthCard from '@/components/AuthCard.vue'

const router = useRouter()
const userStore = useUserStore()

const formData = reactive({
    username: '',
    role: 'USER' as const,
})

const roleOptions = [
    { label: 'Utilisateur', value: 'USER' },
    { label: 'Administrateur', value: 'ADMIN' },
]

const usernameError = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const loading = ref(false)
const showPasswordDialog = ref(false)
const temporaryPassword = ref('')
const createdUsername = ref('')

async function handleCreateUser() {
    errorMessage.value = ''
    successMessage.value = ''
    usernameError.value = ''
    loading.value = true

    if (!formData.username.trim()) {
        errorMessage.value = "Le nom d'utilisateur est requis"
        loading.value = false
        return
    }
    if (!formData.role) {
        errorMessage.value = 'Le rôle est requis'
        loading.value = false
        return
    }

    const result = await userStore.createUser({
        username: formData.username,
        role: formData.role,
    })

    if (result.success) {
        createdUsername.value = formData.username
        temporaryPassword.value = result.temporaryPassword || ''
        showPasswordDialog.value = true
        formData.username = ''
        formData.role = 'USER'
    } else {
        // Error is already a string from the store, display it
        usernameError.value =
            result.error || "Erreur lors de la création de l'utilisateur"
    }
    loading.value = false
}

function goBack() {
    void router.push('/admin')
}

function copyPassword() {
    void navigator.clipboard.writeText(temporaryPassword.value)
}

function closePasswordDialog() {
    showPasswordDialog.value = false
    temporaryPassword.value = ''
    createdUsername.value = ''
}

function closeAndGoBack() {
    closePasswordDialog()
    void router.push('/admin')
}
</script>
