<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">Déplacer « {{ itemName }} »</div>
      </q-card-section>

      <q-card-section class="scroll" style="max-height: 50vh">
        <q-tree
          v-model:selected="selected"
          v-model:expanded="expanded"
          :nodes="nodes"
          node-key="key"
          no-selection-unset
          @lazy-load="loadChildren"
        />
      </q-card-section>

      <q-card-section v-if="errorMessage" class="text-negative">
        {{ errorMessage }}
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Annuler" color="grey" @click="onDialogCancel" />
        <q-btn
          flat
          label="Déplacer ici"
          color="primary"
          :disable="selected === null"
          @click="confirm"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useDialogPluginComponent } from 'quasar';
import { fetchFolderContents } from '@/utils/drive-api';

const ROOT_KEY = 'root';

interface FolderNode {
  key: string;
  label: string;
  icon: string;
  folderId: number | null;
  lazy?: boolean;
  disabled?: boolean;
  children?: FolderNode[];
}

const props = defineProps<{
  itemName: string;
  // Set when a folder is moved: it and its sub-folders cannot be the destination
  movingFolderId?: number;
}>();
defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

const nodes = ref<FolderNode[]>([
  { key: ROOT_KEY, label: 'Mes documents', icon: 'home', folderId: null, lazy: true },
]);
const expanded = ref<string[]>([]);
const selected = ref<string | null>(null);
const errorMessage = ref('');

async function loadChildren({
  node,
  done,
  fail,
}: {
  node: FolderNode;
  done: (children: FolderNode[]) => void;
  fail: () => void;
}) {
  const result = await fetchFolderContents(node.folderId);
  if (!result.ok) {
    errorMessage.value = result.message;
    fail();
    return;
  }

  done(
    result.data.folders.map((folder) => {
      // A disabled node cannot be expanded, which hides the whole sub-tree
      const isMovingFolder = folder.id === props.movingFolderId;
      return {
        key: String(folder.id),
        label: folder.name,
        icon: 'folder',
        folderId: folder.id,
        lazy: !isMovingFolder,
        disabled: isMovingFolder,
      };
    }),
  );
}

function confirm() {
  if (selected.value === null) return;
  onDialogOK(selected.value === ROOT_KEY ? null : Number(selected.value));
}
</script>
