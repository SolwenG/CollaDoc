<template>
    <q-page>
        <FolderExplorer :folder-id="folderId" />
    </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import FolderExplorer from '@/components/FolderExplorer.vue'

const route = useRoute('/folders/[id]')
const folderId = computed(() => Number(route.params.id))
</script>
