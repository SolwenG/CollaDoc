<template>
    <q-dialog v-model="open" persistent>
        <q-card class="setup-card">
            <q-card-section>
                <div class="text-h6">
                    Activer la vérification en deux étapes
                </div>
            </q-card-section>

            <q-card-section class="q-gutter-y-md">
                <div>
                    1. Scannez ce QR code avec votre application
                    d'authentification.
                </div>
                <div class="row justify-center">
                    <!-- TODO : vrai QR code quand le back fournira le secret -->
                    <q-icon name="qr_code_2" size="140px" color="grey-7" />
                </div>

                <div>Ou saisissez cette clé manuellement :</div>
                <q-input :model-value="secret" outlined dense readonly>
                    <template #append>
                        <q-btn
                            flat
                            dense
                            round
                            icon="content_copy"
                            aria-label="Copier la clé"
                            @click="copySecret"
                        />
                    </template>
                </q-input>

                <div>
                    2. Saisissez le code à 6 chiffres affiché par l'application.
                </div>
                <q-form class="q-gutter-y-md" @submit="onSubmit">
                    <q-input
                        v-model="code"
                        label="Code"
                        outlined
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
                        <q-btn
                            type="submit"
                            color="primary"
                            label="Activer"
                            :loading="loading"
                        />
                    </div>
                </q-form>
            </q-card-section>
        </q-card>
    </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { copyToClipboard, useQuasar } from 'quasar'
import { required, sixDigits } from '@/utils/validation'

const open = defineModel<boolean>({ required: true })
const $q = useQuasar()

// TODO : clé factice, à remplacer par celle renvoyée par le back
const secret = ref('JBSWY3DPEHPK3PXP')
const code = ref('')
const codeError = ref('')
const loading = ref(false)

watch(open, (isOpen) => {
    if (isOpen) {
        code.value = ''
        codeError.value = ''
    }
})

async function copySecret() {
    try {
        await copyToClipboard(secret.value)
        $q.notify({ type: 'positive', message: 'Clé copiée.' })
    } catch {
        $q.notify({
            type: 'negative',
            message: 'Copie impossible, sélectionnez la clé à la main.',
        })
    }
}

function onSubmit() {
    // TODO : envoyer le code au back pour activer la 2FA
    codeError.value = 'Code invalide (activation pas encore branchée)'
}
</script>

<style scoped>
.setup-card {
    width: 100%;
    max-width: 420px;
}
</style>
