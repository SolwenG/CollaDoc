<template>
  <q-dialog v-model="open">
    <q-card class="share-card">
      <q-card-section class="row items-center">
        <div class="text-h6">Inviter sur ce document</div>
        <q-space />
        <q-btn v-close-popup flat round dense icon="close" aria-label="Fermer" />
      </q-card-section>

      <q-card-section v-if="errorMessage" class="q-pt-none">
        <q-banner class="bg-negative text-white" rounded>{{ errorMessage }}</q-banner>
      </q-card-section>

      <q-card-section class="q-gutter-y-sm">
        <div class="text-subtitle2">Nouveau lien d'invitation</div>
        <q-option-group v-model="role" :options="ROLE_OPTIONS" inline />
        <q-btn
          color="primary"
          icon="link"
          label="Créer un lien"
          :loading="creating"
          @click="onCreate"
        />

        <template v-if="createdLink">
          <q-input :model-value="createdUrl" outlined dense readonly>
            <template #append>
              <q-btn
                flat
                dense
                round
                icon="content_copy"
                aria-label="Copier le lien"
                @click="copyLink"
              />
            </template>
          </q-input>
          <div class="text-caption">
            Ce lien ne sera plus affiché après la fermeture de cette fenêtre. Il est valable
            jusqu'au {{ formatDate(createdLink.expiresAt) }}.
          </div>
        </template>
      </q-card-section>

      <q-separator />

      <q-card-section>
        <div class="text-subtitle2 q-mb-sm">Liens actifs</div>
        <div v-if="shareLinks.length === 0" class="text-grey-7">Aucun lien actif.</div>
        <q-list v-else dense separator>
          <q-item v-for="link in shareLinks" :key="link.id">
            <q-item-section>
              <q-item-label>{{ ROLE_LABELS[link.role] }}</q-item-label>
              <q-item-label caption>
                Créé le {{ formatDate(link.createdAt) }}, expire le
                {{ formatDate(link.expiresAt) }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn flat dense color="negative" label="Révoquer" @click="onRevoke(link)" />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-separator />

      <q-card-section>
        <div class="text-subtitle2 q-mb-sm">Membres</div>
        <div v-if="members.length === 0" class="text-grey-7">
          Personne n'a encore rejoint ce document.
        </div>
        <q-list v-else dense separator>
          <q-item v-for="member in members" :key="member.user.id">
            <q-item-section>
              <q-item-label>{{ member.user.displayName }}</q-item-label>
              <q-item-label caption>
                @{{ member.user.username }} · {{ ROLE_LABELS[member.role] }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn flat dense color="negative" label="Retirer" @click="onRemove(member)" />
            </q-item-section>
          </q-item>
        </q-list>
        <div class="text-caption text-grey-7 q-mt-sm">
          Retirer un membre ne révoque pas les liens : avec un lien encore actif, il peut revenir.
          Révoquez aussi le lien que vous lui avez envoyé.
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { copyToClipboard, useQuasar } from 'quasar';
import {
  createShareLink,
  fetchMembers,
  fetchShareLinks,
  inviteUrl,
  removeMember,
  revokeShareLink,
  sharingErrorMessage,
} from '@/utils/sharing';
import type { CreatedShareLink, Member, MemberRole, Result, ShareLink } from '@/utils/sharing';

const open = defineModel<boolean>({ required: true });
const props = defineProps<{ documentId: number }>();

const ROLE_LABELS: Record<MemberRole, string> = {
  VIEWER: 'Lecture seule',
  EDITOR: 'Modification',
};

const ROLE_OPTIONS = [
  { label: ROLE_LABELS.VIEWER, value: 'VIEWER' },
  { label: ROLE_LABELS.EDITOR, value: 'EDITOR' },
];

const $q = useQuasar();

const role = ref<MemberRole>('VIEWER');
const createdLink = ref<CreatedShareLink | null>(null);
const shareLinks = ref<ShareLink[]>([]);
const members = ref<Member[]>([]);
const errorMessage = ref('');
const creating = ref(false);

const createdUrl = computed(() => (createdLink.value ? inviteUrl(createdLink.value.token) : ''));

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

// Runs one API call: true on success, false once its error is shown in the dialog
async function run<T>(
  request: () => Promise<Result<T>>,
  onSuccess?: (data: T) => void,
): Promise<boolean> {
  try {
    const result = await request();
    if (result.ok) {
      onSuccess?.(result.data);
      return true;
    }
    errorMessage.value = sharingErrorMessage(result.code);
  } catch {
    errorMessage.value = 'Impossible de joindre le serveur.';
  }
  return false;
}

async function loadShareLinks() {
  await run(
    () => fetchShareLinks(props.documentId),
    (data) => {
      shareLinks.value = data;
    },
  );
}

async function loadMembers() {
  await run(
    () => fetchMembers(props.documentId),
    (data) => {
      members.value = data;
    },
  );
}

// On repart d'une fenêtre propre à chaque ouverture : le jeton d'un lien précédent est perdu
watch(open, async (isOpen) => {
  if (!isOpen) return;
  role.value = 'VIEWER';
  createdLink.value = null;
  errorMessage.value = '';
  await Promise.all([loadShareLinks(), loadMembers()]);
});

async function onCreate() {
  creating.value = true;
  errorMessage.value = '';
  const created = await run(
    () => createShareLink(props.documentId, role.value),
    (link) => {
      createdLink.value = link;
    },
  );
  creating.value = false;
  if (created) await loadShareLinks();
}

async function copyLink() {
  try {
    await copyToClipboard(createdUrl.value);
    $q.notify({ type: 'positive', message: 'Lien copié.' });
  } catch {
    $q.notify({ type: 'negative', message: 'Copie impossible, sélectionnez le lien à la main.' });
  }
}

async function onRevoke(link: ShareLink) {
  errorMessage.value = '';
  if (!(await run(() => revokeShareLink(props.documentId, link.id)))) return;

  // Le lien qu'on vient de créer ne marche plus : on ne l'affiche plus
  if (createdLink.value?.id === link.id) createdLink.value = null;
  await loadShareLinks();
}

async function onRemove(member: Member) {
  errorMessage.value = '';
  if (!(await run(() => removeMember(props.documentId, member.user.id)))) return;

  $q.notify({ type: 'positive', message: `${member.user.displayName} a été retiré du document.` });
  await loadMembers();
}
</script>

<style scoped>
.share-card {
  width: 100%;
  max-width: 560px;
}
</style>
