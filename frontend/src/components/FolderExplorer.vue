<template>
    <div class="q-pa-md" style="max-width: 900px; margin: 0 auto">
        <q-breadcrumbs class="q-mb-md text-h6" active-color="dark">
            <q-breadcrumbs-el
                label="Mes documents"
                icon="home"
                :to="contents?.folder ? '/' : undefined"
            />
            <q-breadcrumbs-el
                v-for="ancestor in contents?.ancestors ?? []"
                :key="ancestor.id"
                :label="ancestor.name"
                :to="`/folders/${ancestor.id}`"
            />
            <q-breadcrumbs-el v-if="contents?.folder" :label="contents.folder.name" />
        </q-breadcrumbs>

        <div class="row q-gutter-sm q-mb-md">
            <q-btn
                icon="create_new_folder"
                label="Nouveau dossier"
                color="primary"
                outline
                :disable="!contents"
                @click="onCreateFolder"
            />
            <q-btn
                icon="note_add"
                label="Nouveau document"
                color="primary"
                outline
                :disable="!contents"
                @click="onCreateTextDocument"
            />
            <q-btn
                icon="upload_file"
                label="Envoyer un fichier"
                color="primary"
                :disable="!contents"
                :loading="uploading"
                @click="uploadInput?.click()"
            />
            <input
                ref="uploadInput"
                type="file"
                :accept="ACCEPTED_TYPES"
                hidden
                @change="onUploadSelected"
            />
            <input
                ref="replaceInput"
                type="file"
                :accept="ACCEPTED_TYPES"
                hidden
                @change="onReplaceSelected"
            />
        </div>

        <q-banner v-if="errorMessage" class="bg-negative text-white rounded-borders q-mb-md">
            {{ errorMessage }}
        </q-banner>

        <q-card v-if="contents">
            <q-list separator>
                <q-item
                    v-for="folder in contents.folders"
                    :key="`folder-${folder.id}`"
                    clickable
                    @click="router.push(`/folders/${folder.id}`)"
                >
                    <q-item-section avatar>
                        <q-icon name="folder" color="amber-8" />
                    </q-item-section>
                    <q-item-section>
                        <q-item-label>{{ folder.name }}</q-item-label>
                        <q-item-label caption
                            >Modifié le {{ formatDate(folder.updatedAt) }} · —</q-item-label
                        >
                    </q-item-section>
                    <q-item-section side>
                        <q-btn flat round dense icon="more_vert" aria-label="Actions" @click.stop>
                            <q-menu auto-close>
                                <q-list dense style="min-width: 160px">
                                    <q-item clickable @click="onRenameFolder(folder)">
                                        <q-item-section>Renommer</q-item-section>
                                    </q-item>
                                    <q-item clickable @click="onMoveFolder(folder)">
                                        <q-item-section>Déplacer</q-item-section>
                                    </q-item>
                                    <q-item
                                        clickable
                                        class="text-negative"
                                        @click="onDeleteFolder(folder)"
                                    >
                                        <q-item-section>Supprimer</q-item-section>
                                    </q-item>
                                </q-list>
                            </q-menu>
                        </q-btn>
                    </q-item-section>
                </q-item>

                <q-item
                    v-for="document in contents.documents"
                    :key="`document-${document.id}`"
                    clickable
                    @click="openDocument(document)"
                >
                    <q-item-section avatar>
                        <q-icon
                            :name="documentIcon(document)"
                            :color="documentIconColor(document)"
                        />
                    </q-item-section>
                    <q-item-section>
                        <q-item-label>{{ document.name }}</q-item-label>
                        <q-item-label caption>
                            Modifié le {{ formatDate(document.updatedAt) }} ·
                            {{ document.lastModifiedBy?.displayName ?? '—' }}
                            <span v-if="document.size !== null">
                                · {{ formatSize(document.size) }}</span
                            >
                        </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                        <q-btn flat round dense icon="more_vert" aria-label="Actions" @click.stop>
                            <q-menu auto-close>
                                <q-list dense style="min-width: 160px">
                                    <q-item clickable @click="onRenameDocument(document)">
                                        <q-item-section>Renommer</q-item-section>
                                    </q-item>
                                    <q-item clickable @click="onMoveDocument(document)">
                                        <q-item-section>Déplacer</q-item-section>
                                    </q-item>
                                    <template v-if="document.kind === 'FILE'">
                                        <q-item clickable @click="onReplaceDocument(document)">
                                            <q-item-section>Remplacer le fichier</q-item-section>
                                        </q-item>
                                        <q-item clickable :href="fileUrl(document.id, true)">
                                            <q-item-section>Télécharger</q-item-section>
                                        </q-item>
                                    </template>
                                    <q-item
                                        clickable
                                        class="text-negative"
                                        @click="onDeleteDocument(document)"
                                    >
                                        <q-item-section>Supprimer</q-item-section>
                                    </q-item>
                                </q-list>
                            </q-menu>
                        </q-btn>
                    </q-item-section>
                </q-item>

                <q-item v-if="contents.folders.length === 0 && contents.documents.length === 0">
                    <q-item-section class="text-center text-grey"
                        >Ce dossier est vide</q-item-section
                    >
                </q-item>
            </q-list>
        </q-card>

        <q-inner-loading :showing="loading" />
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE_BYTES } from '@shared/files.ts'
import FilePreviewDialog from '@/components/FilePreviewDialog.vue'
import MoveDialog from '@/components/MoveDialog.vue'
import {
    createFolder,
    createTextDocument,
    deleteDocument,
    deleteFolder,
    fetchFolderContents,
    fileUrl,
    replaceFile,
    updateDocument,
    updateFolder,
    uploadFile,
    type ApiResult,
    type DocumentView,
    type FolderContents,
    type FolderView,
} from '@/utils/drive-api'

const ACCEPTED_TYPES = ALLOWED_FILE_TYPES.join(',')

// null = root of the current user
const props = defineProps<{ folderId: number | null }>()

const $q = useQuasar()
const router = useRouter()

const contents = ref<FolderContents | null>(null)
const loading = ref(false)
const uploading = ref(false)
const errorMessage = ref('')
const uploadInput = ref<HTMLInputElement | null>(null)
const replaceInput = ref<HTMLInputElement | null>(null)
let replacedDocument: DocumentView | null = null

async function load() {
    loading.value = true
    const result = await fetchFolderContents(props.folderId)
    loading.value = false

    if (result.ok) {
        contents.value = result.data
        errorMessage.value = ''
    } else {
        contents.value = null
        errorMessage.value = result.message
    }
}

watch(() => props.folderId, load, { immediate: true })

// Notifies the error, or reloads the folder when the action succeeded
async function afterAction<T>(result: ApiResult<T>, successMessage: string) {
    if (!result.ok) {
        $q.notify({ type: 'negative', message: result.message })
        return false
    }
    $q.notify({ type: 'positive', message: successMessage })
    await load()
    return true
}

// The API answers "2026-10-09 09:39:33.682+00", which not every browser parses
function formatDate(value: string) {
    const iso = value.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00')
    return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} o`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function documentIcon(document: DocumentView) {
    if (document.kind === 'TEXT') return 'description'
    return document.mimeType === 'application/pdf' ? 'picture_as_pdf' : 'image'
}

function documentIconColor(document: DocumentView) {
    if (document.kind === 'TEXT') return 'primary'
    return document.mimeType === 'application/pdf' ? 'red-7' : 'teal'
}

function askName(title: string, initial = '') {
    return new Promise<string | null>((resolve) => {
        $q.dialog({
            title,
            prompt: {
                model: initial,
                type: 'text',
                isValid: (value: string) => value.trim() !== '',
            },
            cancel: true,
        })
            .onOk((value: string) => resolve(value.trim()))
            .onCancel(() => resolve(null))
    })
}

function askConfirmation(title: string, message: string) {
    return new Promise<boolean>((resolve) => {
        $q.dialog({
            title,
            message,
            cancel: true,
            ok: { label: 'Supprimer', color: 'negative', flat: true },
        })
            .onOk(() => resolve(true))
            .onCancel(() => resolve(false))
    })
}

function askDestination(itemName: string, movingFolderId?: number) {
    return new Promise<number | null | undefined>((resolve) => {
        $q.dialog({ component: MoveDialog, componentProps: { itemName, movingFolderId } })
            .onOk((folderId: number | null) => resolve(folderId))
            .onCancel(() => resolve(undefined))
    })
}

function openDocument(document: DocumentView) {
    if (document.kind === 'TEXT') {
        void router.push(`/documents/${document.id}`)
        return
    }
    $q.dialog({ component: FilePreviewDialog, componentProps: { document } })
}

async function onCreateFolder() {
    const name = await askName('Nouveau dossier')
    if (name === null) return
    await afterAction(await createFolder(name, props.folderId), 'Dossier créé')
}

async function onCreateTextDocument() {
    const name = await askName('Nouveau document')
    if (name === null) return
    const result = await createTextDocument(name, props.folderId)
    if (!result.ok) {
        $q.notify({ type: 'negative', message: result.message })
        return
    }
    await router.push(`/documents/${result.data.document.id}`)
}

// Checked by the API too: this only spares a 20 MB upload doomed to fail
function takeSelectedFile(input: HTMLInputElement | null) {
    const file = input?.files?.[0] ?? null
    if (input) input.value = ''
    if (file && file.size > MAX_FILE_SIZE_BYTES) {
        $q.notify({ type: 'negative', message: 'Le fichier dépasse 20 Mo' })
        return null
    }
    return file
}

async function onUploadSelected() {
    const file = takeSelectedFile(uploadInput.value)
    if (!file) return
    uploading.value = true
    await afterAction(await uploadFile(file, props.folderId), 'Fichier envoyé')
    uploading.value = false
}

function onReplaceDocument(document: DocumentView) {
    replacedDocument = document
    replaceInput.value?.click()
}

async function onReplaceSelected() {
    const file = takeSelectedFile(replaceInput.value)
    if (!file || !replacedDocument) return
    uploading.value = true
    await afterAction(await replaceFile(replacedDocument.id, file), 'Fichier remplacé')
    uploading.value = false
}

async function onRenameFolder(folder: FolderView) {
    const name = await askName('Renommer le dossier', folder.name)
    if (name === null || name === folder.name) return
    await afterAction(await updateFolder(folder.id, { name }), 'Dossier renommé')
}

async function onMoveFolder(folder: FolderView) {
    const parentId = await askDestination(folder.name, folder.id)
    if (parentId === undefined || parentId === folder.parentId) return
    await afterAction(await updateFolder(folder.id, { parentId }), 'Dossier déplacé')
}

async function onDeleteFolder(folder: FolderView) {
    const confirmed = await askConfirmation(
        'Supprimer le dossier',
        `« ${folder.name} » et tout son contenu (sous-dossiers et documents) seront supprimés définitivement.`
    )
    if (!confirmed) return
    await afterAction(await deleteFolder(folder.id), 'Dossier supprimé')
}

async function onRenameDocument(document: DocumentView) {
    const name = await askName('Renommer le document', document.name)
    if (name === null || name === document.name) return
    await afterAction(await updateDocument(document.id, { name }), 'Document renommé')
}

async function onMoveDocument(document: DocumentView) {
    const folderId = await askDestination(document.name)
    if (folderId === undefined || folderId === document.folderId) return
    await afterAction(await updateDocument(document.id, { folderId }), 'Document déplacé')
}

async function onDeleteDocument(document: DocumentView) {
    const confirmed = await askConfirmation(
        'Supprimer le document',
        `« ${document.name} » sera supprimé définitivement.`
    )
    if (!confirmed) return
    await afterAction(await deleteDocument(document.id), 'Document supprimé')
}
</script>
