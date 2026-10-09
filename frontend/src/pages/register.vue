<template>
    <AuthCard title="Créer un compte">
        <q-form class="q-gutter-y-md" @submit="onSubmit">
            <q-input
                v-model="username"
                label="Identifiant"
                hint="3 à 32 caractères, en minuscules"
                outlined
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
                v-model="displayName"
                label="Nom d'affichage"
                hint="Le nom que les autres verront, 2 à 50 caractères"
                outlined
                lazy-rules
                autocomplete="off"
                :rules="[
                    required,
                    minLength(DISPLAY_NAME_MIN_LENGTH),
                    maxLength(DISPLAY_NAME_MAX_LENGTH),
                    displayNameCharacters,
                ]"
                :error="!!displayNameError"
                :error-message="displayNameError"
                @update:model-value="displayNameError = ''"
            />
            <q-input
                v-model="password"
                label="Mot de passe"
                outlined
                type="password"
                lazy-rules
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
            />
            <div v-if="password">
                <q-linear-progress :value="(score + 1) / 5" :color="color" />
                <div class="text-caption">{{ label }}</div>
            </div>
            <q-input
                v-model="confirmPassword"
                label="Confirmer le mot de passe"
                outlined
                type="password"
                lazy-rules
                autocomplete="new-password"
                :rules="[required, samePassword]"
            />

            <q-btn
                type="submit"
                color="primary"
                label="S'inscrire"
                class="full-width"
                :loading="loading"
            />
        </q-form>
        <div class="q-mt-md">
            Déjà un compte ?
            <router-link
                :to="{ path: '/login', query: route.query }"
                class="text-primary text-bold"
            >
                Se connecter
            </router-link>
        </div>
    </AuthCard>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import AuthCard from '@/components/AuthCard.vue'
import { usePasswordStrength } from '@/hooks/usePasswordStrength'
import { postJson, readApiError } from '@/utils/api'
import {
    DISPLAY_NAME_MIN_LENGTH,
    DISPLAY_NAME_MAX_LENGTH,
    PASSWORD_MAX_LENGTH,
    PASSWORD_MIN_LENGTH,
    USERNAME_MAX_LENGTH,
    USERNAME_MIN_LENGTH,
    displayNameCharacters,
    maxLength,
    minLength,
    required,
    safeCharacters,
} from '@/utils/validation'
const $q = useQuasar()
const route = useRoute()
const router = useRouter()

const username = ref('')
const displayName = ref('')
const password = ref('')
const confirmPassword = ref('')
const usernameError = ref('')
const displayNameError = ref('')
const passwordError = ref('')
const loading = ref(false)

const { score, label, color, strongEnough } = usePasswordStrength(password)

const samePassword = (val: string) =>
    val === password.value || 'Les mots de passe ne correspondent pas'

// details comes from z.flattenError on the back: { fieldErrors: { field: [messages] } }
function showFieldErrors(details: unknown) {
    const fieldErrors = (
        details as { fieldErrors?: Record<string, string[] | undefined> } | undefined
    )?.fieldErrors
    if (!fieldErrors) return false

    usernameError.value = fieldErrors.username?.[0] ?? ''
    displayNameError.value = fieldErrors.displayName?.[0] ?? ''
    passwordError.value = fieldErrors.password?.[0] ?? ''

    return !!(usernameError.value || displayNameError.value || passwordError.value)
}

async function onSubmit() {
    loading.value = true
    try {
        const response = await postJson('/users/register', {
            username: username.value.trim(),
            displayName: displayName.value.trim(),
            password: password.value,
        })

        if (response.status === 201) {
            $q.notify({ type: 'positive', message: 'Compte créé, vous pouvez vous connecter.' })
            // Keeps ?redirect=… so the login still leads to the invitation
            await router.push({ path: '/login', query: route.query })
            return
        }

        const error = await readApiError(response)

        if (error?.code === 'USERNAME_TAKEN') {
            usernameError.value = 'Cet identifiant est déjà utilisé.'
            return
        }

        if (error?.code === 'PASSWORD_TOO_SHORT' || error?.code === 'PASSWORD_TOO_LONG') {
            passwordError.value = error.message
            return
        }

        if (error?.code === 'VALIDATION_ERROR' && showFieldErrors(error.details)) {
            return
        }

        $q.notify({ type: 'negative', message: 'Une erreur est survenue. Réessayez plus tard.' })
    } catch {
        $q.notify({ type: 'negative', message: 'Impossible de joindre le serveur.' })
    } finally {
        loading.value = false
    }
}
</script>
