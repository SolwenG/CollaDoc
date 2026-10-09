<template>
  <q-dialog ref="dialogRef" maximized @hide="onDialogHide">
    <q-card class="column no-wrap">
      <q-bar class="bg-primary text-white">
        <q-icon :name="isPdf ? 'picture_as_pdf' : 'image'" />
        <div class="ellipsis">{{ document.name }}</div>
        <q-space />
        <q-btn dense flat icon="download" :href="fileUrl(document.id, true)">
          <q-tooltip>Télécharger</q-tooltip>
        </q-btn>
        <q-btn dense flat icon="close" @click="onDialogCancel">
          <q-tooltip>Fermer</q-tooltip>
        </q-btn>
      </q-bar>

      <div class="col flex flex-center bg-grey-3">
        <iframe v-if="isPdf" :src="fileUrl(document.id)" :title="document.name" class="pdf" />
        <img v-else :src="fileUrl(document.id)" :alt="document.name" class="image" />
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDialogPluginComponent } from 'quasar';
import { fileUrl, type DocumentView } from '@/utils/drive-api';

const props = defineProps<{ document: DocumentView }>();
defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogCancel } = useDialogPluginComponent();

const isPdf = computed(() => props.document.mimeType === 'application/pdf');
</script>

<style scoped>
.pdf {
  width: 100%;
  height: 100%;
  border: none;
}

.image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
</style>
