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

            <q-btn
                type="submit"
                color="primary"
                label="Se connecter"
                class="full-width"
                :loading="loading"
            />
        </q-form>
        <div class="q-mt-md">
            Pas encore de compte ?
            <router-link
                :to="{ path: '/register', query: route.query }"
                class="text-primary text-bold"
            >
                Créer un compte
            </router-link>
        </div>
        <TwoFactorDialog v-model="showTwoFactor" @verified="goToRequestedPage" />
    </AuthCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import AuthCard from '@/components/AuthCard.vue'
import TwoFactorDialog from '@/components/TwoFactorDialog.vue'
import { useAuthStore } from '@/stores/auth'
import { required } from '@/utils/validation'
import { safeRedirect } from '@/utils/redirect'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const loading = ref(false)
const showTwoFactor = ref(false)

// Set by the router guard when a page needed a login, e.g. an invitation link
const redirect = computed(() => safeRedirect(route.query.redirect))

async function goToRequestedPage() {
    await router.push(redirect.value)
}

async function onSubmit() {
    loading.value = true
    try {
        const result = await auth.login(username.value.trim().toLowerCase(), password.value)

        if (result === 'success') {
            await goToRequestedPage()
            return
        }

        if (result === 'mfa-required') {
            showTwoFactor.value = true
            return
        }

        if (result === 'invalid') {
            $q.notify({
                type: 'negative',
                message: 'Identifiant ou mot de passe incorrect.',
            })
            return
        }

        if (result === 'blocked') {
            $q.notify({
                type: 'negative',
                message: 'Ce compte est bloqué. Contactez un administrateur.',
            })
            return
        }

        if (result === 'rate-limited') {
            $q.notify({
                type: 'negative',
                message: 'Trop de tentatives. Réessayez dans quelques minutes.',
            })
            return
        }

        $q.notify({
            type: 'negative',
            message: 'Une erreur est survenue. Réessayez plus tard.',
        })
    } catch {
        $q.notify({
            type: 'negative',
            message: 'Impossible de joindre le serveur.',
        })
    } finally {
        loading.value = false
    }
}
</script>
