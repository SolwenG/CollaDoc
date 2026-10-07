<template>
  <q-page padding>
    <div class="q-pa-md" style="max-width: 800px; margin: 0 auto">
      <div class="row items-center justify-between q-mb-md">
        <h1 class="text-h5 q-ma-none">Liste des utilisateurs</h1>
        <q-btn label="Créer un nouvel utilisateur" color="primary" @click="goToNewUser" />
      </div>

      <q-card>
        <q-list separator>
          <q-item v-for="user in users" :key="user.id">
            <q-item-section avatar>
              <q-icon name="person" />
            </q-item-section>

            <q-item-section>
              <q-item-label>{{ user.displayName }}</q-item-label>
              <q-item-label caption>@{{ user.username }}</q-item-label>
            </q-item-section>

            <q-item-section side>
              <q-btn
                :icon="isUserBlocked(user) ? 'block' : 'block'"
                :color="isUserBlocked(user) ? 'negative' : 'grey'"
                flat
                round
                @click="openBlockModal(user)"
              >
                <q-tooltip>
                  {{ isUserBlocked(user) ? "Débloquer l'utilisateur" : "Bloquer l'utilisateur" }}
                </q-tooltip>
              </q-btn>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card>
    </div>

    <q-dialog v-model="blockDialog.show">
      <q-card>
        <q-card-section>
          <div class="text-h6">
            {{ blockDialog.user && isUserBlocked(blockDialog.user) ? 'Débloquer' : 'Bloquer' }}
            l'utilisateur
          </div>
        </q-card-section>

        <q-card-section>
          {{
            blockDialog.user
              ? `Êtes-vous sûr de vouloir ${isUserBlocked(blockDialog.user) ? 'débloquer' : 'bloquer'} ${blockDialog.user.displayName} (@${blockDialog.user.username}) ?`
              : ''
          }}
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Annuler" color="grey" @click="blockDialog.show = false" />
          <q-btn
            flat
            label="Confirmer"
            :color="blockDialog.user && isUserBlocked(blockDialog.user) ? 'positive' : 'negative'"
            @click="confirmBlock"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore, type User } from '@/stores/user';

const router = useRouter();
const userStore = useUserStore();

const users = ref<User[]>([]);
const loading = ref(false);
const errorMessage = ref('');

const blockDialog = reactive({
  show: false,
  user: null as User | null,
});

onMounted(async () => {
  loading.value = true;
  errorMessage.value = '';
  users.value = await userStore.fetchAllUsers();
  if (users.value.length === 0) {
    errorMessage.value = 'Erreur lors du chargement des utilisateurs';
  }
  loading.value = false;
});

function isUserBlocked(user: User): boolean {
  return user.blockedAt !== null;
}

function openBlockModal(user: User) {
  blockDialog.user = user;
  blockDialog.show = true;
}

async function confirmBlock() {
  if (!blockDialog.user) return;

  const updatedUser = await userStore.toggleBlockUser(
    blockDialog.user.id,
    !isUserBlocked(blockDialog.user),
  );
  if (updatedUser) {
    const index = users.value.findIndex((u) => u.id === blockDialog.user!.id);
    if (index !== -1) {
      users.value[index] = updatedUser;
    }
  }
  blockDialog.show = false;
  blockDialog.user = null;
}

function goToNewUser() {
  void router.push('/admin/create');
}
</script>
