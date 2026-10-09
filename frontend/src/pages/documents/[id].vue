<template>
    <q-page padding class="column">
        <q-breadcrumbs class="q-mb-sm">
            <q-breadcrumbs-el v-if="isOwner" label="Mes documents" icon="home" to="/" />
            <q-breadcrumbs-el v-else label="Accueil" icon="home" to="/" />
            <q-breadcrumbs-el
                v-for="folder in details?.path ?? []"
                :key="folder.id"
                :label="folder.name"
                :to="`/folders/${folder.id}`"
            />
            <q-breadcrumbs-el :label="details?.document.name ?? '…'" />
        </q-breadcrumbs>

        <div class="row items-center q-mb-md q-gutter-sm">
            <h1 class="text-h5 q-my-none ellipsis">{{ details?.document.name ?? 'Document' }}</h1>
            <q-chip v-if="role === 'VIEWER'" icon="visibility" dense>Lecture seule</q-chip>
            <q-chip
                :color="STATUS[status].color"
                text-color="white"
                :icon="STATUS[status].icon"
                dense
            >
                {{ STATUS[status].label }}
            </q-chip>
            <q-space />
            <CallDialog />
            <q-btn
                v-if="role === 'OWNER'"
                color="primary"
                icon="person_add"
                label="Inviter"
                dense
                @click="showShareDialog = true"
            />
        </div>

        <q-banner v-if="closedMessage" class="bg-negative text-white q-mb-md" rounded>
            {{ closedMessage }}
        </q-banner>

        <q-banner v-if="lostText !== null" class="bg-warning q-mb-md" rounded>
            Certaines de vos modifications n'ont pas pu être synchronisées. Le document a été
            rechargé, voici votre version pour la recopier si besoin.
            <template #action>
                <q-btn flat label="Copier" @click="copyLostText" />
                <q-btn flat label="Fermer" @click="lostText = null" />
            </template>
        </q-banner>

        <textarea
            ref="textarea"
            class="editor col"
            spellcheck="true"
            :readonly="readonly"
            @input="onInput"
            @beforeinput="onBeforeInput"
            @keydown="onKeydown"
        />

        <ShareDialog v-model="showShareDialog" :document-id="documentId" />
        <div class="row">
            <textarea
                ref="textarea"
                class="editor col"
                spellcheck="true"
                :readonly="readonly"
                @input="onInput"
                @beforeinput="onBeforeInput"
                @keydown="onKeydown"
            />

            <q-card class="members-sidebar q-ml-md" flat bordered>
                <q-card-section>
                    <div class="text-h6">Membres</div>
                </q-card-section>
                <q-list separator>
                    <q-item v-for="member in members" :key="member.id">
                        <q-item-section avatar>
                            <q-avatar color="primary" text-color="white">
                                {{ member.displayName.charAt(0).toUpperCase() }}
                            </q-avatar>
                        </q-item-section>
                        <q-item-section>
                            <q-item-label>{{ member.displayName }}</q-item-label>
                            <q-item-label caption>@{{ member.username }}</q-item-label>
                        </q-item-section>
                        <q-item-section side>
                            <CallButton
                                :doc-id="Number(route.params.id)"
                                :target-user-id="member.id"
                            />
                        </q-item-section>
                    </q-item>
                    <q-item v-if="members.length === 0">
                        <q-item-section>
                            <q-item-label caption>Chargement...</q-item-label>
                        </q-item-section>
                    </q-item>
                </q-list>
            </q-card>
        </div>
    </q-page>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { copyToClipboard, useQuasar } from 'quasar'
import { useCollaborativeDocument } from '@/hooks/useCollaborativeDocument'
import ShareDialog from '@/components/ShareDialog.vue'
import { fetchDocument, type DocumentDetails } from '@/utils/drive-api'
import CallButton from '@/components/CallButton.vue'
import CallDialog from '@/components/CallDialog.vue'
import { fetchDocumentMembers, type DocumentMember } from '@/utils/document.ts'

const STATUS = {
    connecting: { label: 'Connexion…', color: 'grey', icon: 'sync' },
    online: { label: 'Synchronisé', color: 'positive', icon: 'cloud_done' },
    offline: {
        label: 'Hors ligne, modifications conservées',
        color: 'orange',
        icon: 'cloud_off',
    },
    closed: { label: 'Fermé', color: 'negative', icon: 'block' },
} as const

const route = useRoute('/documents/[id]')
const documentId = Number(route.params.id)
const $q = useQuasar()
const textarea = ref<HTMLTextAreaElement | null>(null)
const members = ref<DocumentMember[]>([])
const showShareDialog = ref(false)

const { status, role, readonly, closedMessage, lostText, onInput, onBeforeInput, onKeydown } =
    useCollaborativeDocument(documentId, textarea)

const details = ref<DocumentDetails | null>(null)
const isOwner = computed(() => details.value?.access === 'OWNER')

watch(
    () => route.params.id,
    async (id) => {
        const result = await fetchDocument(Number(id))
        details.value = result.ok ? result.data : null
    },
    { immediate: true }
)

async function copyLostText() {
    if (lostText.value === null) return
    await copyToClipboard(lostText.value)
    $q.notify({ message: 'Texte copié', type: 'positive' })
}

onMounted(async () => {
    const docId = Number(route.params.id)
    const data = await fetchDocumentMembers(docId)
    if (data) members.value = data
})
</script>

<style scoped>
.editor {
    width: 100%;
    min-height: 60vh;
    padding: 16px;
    font-family: ui-monospace, monospace;
    font-size: 15px;
    line-height: 1.5;
    border: 1px solid #ccc;
    border-radius: 4px;
    resize: none;
}

.editor:read-only {
    background: #f5f5f5;
}

.members-sidebar {
    width: 300px;
    min-width: 300px;
}
</style>
