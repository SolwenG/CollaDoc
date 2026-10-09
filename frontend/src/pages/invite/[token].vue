<template>
  <q-page padding class="flex flex-center">
    <q-card class="invite-card">
      <q-card-section>
        <div class="text-h6">Invitation</div>
      </q-card-section>

      <q-card-section v-if="errorMessage" class="q-gutter-y-md">
        <q-banner class="bg-negative text-white" rounded>{{ errorMessage }}</q-banner>
        <q-btn color="primary" label="Retour à l'accueil" to="/" />
      </q-card-section>

      <q-card-section v-else class="row items-center q-gutter-sm">
        <q-spinner color="primary" size="24px" />
        <div>Ouverture de l'invitation…</div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useQuasar } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import { acceptShareLink, sharingErrorMessage } from '@/utils/sharing';
import type { AcceptResult } from '@/utils/sharing';

// Le propriétaire est simplement redirigé : pas de message pour lui
const OUTCOME_MESSAGES: Record<AcceptResult['outcome'], string | null> = {
  joined: 'Vous avez rejoint le document.',
  upgraded: 'Votre accès a été étendu : vous pouvez maintenant modifier ce document.',
  unchanged: 'Vous avez déjà accès à ce document.',
  owner: null,
};

const $q = useQuasar();
const route = useRoute('/invite/[token]');
const router = useRouter();

const errorMessage = ref('');

// Cette page n'est qu'un point d'entrée : l'acceptation elle-même part en POST
onMounted(async () => {
  try {
    const result = await acceptShareLink(route.params.token);
    if (!result.ok) {
      errorMessage.value = sharingErrorMessage(result.code);
      return;
    }

    const { documentId, outcome } = result.data;
    const message = OUTCOME_MESSAGES[outcome];
    if (message) $q.notify({ type: 'positive', message });

    // replace et non push : « Précédent » ne doit pas rejouer l'invitation
    await router.replace(`/documents/${documentId}`);
  } catch {
    errorMessage.value = 'Impossible de joindre le serveur.';
  }
});
</script>

<style scoped>
.invite-card {
  width: 100%;
  max-width: 480px;
}
</style>
