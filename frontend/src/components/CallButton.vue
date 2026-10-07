<template>
  <q-btn v-if="status === 'idle'" icon="call" round dense color="positive" @click="startCall(docId, targetUserId)">
    <q-tooltip>Appeler</q-tooltip>
  </q-btn>
</template>

<script setup lang="ts">
import {useCall} from '@/hooks/useCall';

defineProps<{ docId: number; targetUserId: number }>();
const {status, startCall} = useCall();
</script>
