<template>
  <!-- Bouton d'appel : visible uniquement si aucun appel n'est en cours -->
  <q-btn
    v-if="status === 'idle'"
    icon="call"
    round
    color="positive"
    @click="startCall(docId, targetUserId)"
  >
    <q-tooltip>Appeler</q-tooltip>
  </q-btn>

  <!-- Appel entrant -->
  <q-dialog :model-value="status === 'ringing'" persistent>
    <q-card>
      <q-card-section>{{ incoming?.from.displayName }} vous appelle…</q-card-section>
      <q-card-actions align="right">
        <q-btn icon="call_end" color="negative" round @click="declineCall"/>
        <q-btn icon="call" color="positive" round @click="acceptCall"/>
      </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- Barre d'appel en cours -->
  <div v-if="inCall" class="row items-center q-gutter-sm">
    <q-chip :color="status === 'connected' ? 'positive' : 'warning'" text-color="white">
      {{ statusLabel }}
    </q-chip>
    <q-btn
      v-if="status === 'connected'"
      round
      :icon="muted ? 'mic_off' : 'mic'"
      :color="muted ? 'grey' : 'primary'"
      @click="toggleMute"
    />
    <q-btn round icon="call_end" color="negative" @click="hangup"/>
  </div>
</template>

<script setup lang="ts">
import {watch} from 'vue';
import {useQuasar} from 'quasar';
import {useCall} from "@/hooks/useCall";

const $q = useQuasar();
const {status, incoming, muted, error, lastEnd, acceptCall, declineCall, hangup, toggleMute} = useCall();

const errorMessages: Record<string, string> = {
  busy: "L'utilisateur est déjà en appel",
  forbidden: 'Accès au document refusé',
  not_present: "L'utilisateur n'est plus sur ce document",
  invalid_target: 'Destinataire invalide',
  mic_denied: 'Micro inaccessible',
  connection_failed: 'La connexion audio a échoué',
  server_error: 'Erreur serveur',
};
watch(error, (e) => e && $q.notify({type: 'negative', message: errorMessages[e] ?? e}));

const endMessages: Record<string, string> = {
  declined: 'Appel refusé',
  timeout: 'Pas de réponse',
  disconnected: 'Correspondant déconnecté',
  hangup: 'Appel terminé',
  cancelled: 'Appel annulé',
};
watch(lastEnd, (e) => {
  const msg = endMessages[e.reason];
  if (msg) $q.notify({type: 'negative', message: msg});
});
</script>
