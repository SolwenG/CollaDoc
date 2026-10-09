<template>
  <q-page padding class="column">
    <div class="row items-center q-mb-md q-gutter-sm">
      <h1 class="text-h5 q-my-none">Document</h1>
      <q-space />
      <q-btn
        v-if="role === 'OWNER'"
        color="primary"
        icon="person_add"
        label="Inviter"
        dense
        @click="showShareDialog = true"
      />
      <q-chip v-if="role === 'VIEWER'" icon="visibility" dense>Lecture seule</q-chip>
      <q-chip :color="STATUS[status].color" text-color="white" :icon="STATUS[status].icon" dense>
        {{ STATUS[status].label }}
      </q-chip>
    </div>

    <q-banner v-if="closedMessage" class="bg-negative text-white q-mb-md" rounded>
      {{ closedMessage }}
    </q-banner>

    <q-banner v-if="lostText !== null" class="bg-warning q-mb-md" rounded>
      Certaines de vos modifications n'ont pas pu être synchronisées. Le document a été rechargé,
      voici votre version pour la recopier si besoin.
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
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { copyToClipboard, useQuasar } from 'quasar';
import ShareDialog from '@/components/ShareDialog.vue';
import { useCollaborativeDocument } from '@/composables/useCollaborativeDocument';

const STATUS = {
  connecting: { label: 'Connexion…', color: 'grey', icon: 'sync' },
  online: { label: 'Synchronisé', color: 'positive', icon: 'cloud_done' },
  offline: { label: 'Hors ligne, modifications conservées', color: 'orange', icon: 'cloud_off' },
  closed: { label: 'Fermé', color: 'negative', icon: 'block' },
} as const;

const route = useRoute('/documents/[id]');
const documentId = Number(route.params.id);
const $q = useQuasar();
const textarea = ref<HTMLTextAreaElement | null>(null);
const showShareDialog = ref(false);

const { status, role, readonly, closedMessage, lostText, onInput, onBeforeInput, onKeydown } =
  useCollaborativeDocument(documentId, textarea);

async function copyLostText() {
  if (lostText.value === null) return;
  await copyToClipboard(lostText.value);
  $q.notify({ message: 'Texte copié', type: 'positive' });
}
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
</style>
