<template>
    <q-page padding>
        <div class="q-pa-md" style="max-width: 800px; margin: 0 auto">
            <div class="row items-center justify-between q-mb-md">
                <h1 class="text-h5 q-ma-none">Liste des utilisateurs</h1>
                <q-btn label="Créer un nouvel utilisateur" color="primary" @click="goToNewUser" />
            </div>

            <!-- Search and Filters -->
            <q-card class="q-mb-md">
                <q-card-section>
                    <q-input
                        v-model="searchQuery"
                        label="Rechercher un utilisateur"
                        outlined
                        dense
                        clearable
                        debounce="300"
                        @update:model-value="loadUsers"
                    >
                        <template #prepend>
                            <q-icon name="search" />
                        </template>
                    </q-input>
                </q-card-section>
            </q-card>

            <!-- Loading State -->
            <q-banner v-if="loading" class="bg-info text-white rounded-borders">
                Chargement des utilisateurs...
            </q-banner>

            <!-- Error State -->
            <q-banner v-if="errorMessage" class="bg-negative text-white rounded-borders">
                {{ errorMessage }}
            </q-banner>

            <!-- Users List -->
            <q-card v-if="!loading">
                <q-list separator>
                    <q-item v-for="user in users" :key="user.id">
                        <q-item-section avatar>
                            <q-icon name="person" />
                        </q-item-section>

                        <q-item-section>
                            <q-item-label>{{ user.displayName }}</q-item-label>
                            <q-item-label caption>@{{ user.username }}</q-item-label>
                            <q-item-label caption>
                                <q-chip
                                    size="xs"
                                    :color="user.role === 'ADMIN' ? 'primary' : 'grey'"
                                    text-color="white"
                                >
                                    {{ user.role }}
                                </q-chip>
                                <q-chip
                                    v-if="user.mfaEnabled"
                                    size="xs"
                                    color="positive"
                                    text-color="white"
                                >
                                    MFA
                                </q-chip>
                                <q-chip
                                    v-if="user.mustChangePassword"
                                    size="xs"
                                    color="warning"
                                    text-color="white"
                                >
                                    Mot de passe à changer
                                </q-chip>
                            </q-item-label>
                            <q-item-label v-if="user.blockedAt" caption class="text-negative">
                                Bloqué le
                                {{ new Date(user.blockedAt).toLocaleString() }}
                                <span v-if="user.blockedBy">
                                    par {{ user.blockedBy.displayName }}</span
                                >
                            </q-item-label>
                        </q-item-section>

                        <q-item-section side>
                            <q-btn
                                :icon="isUserBlocked(user) ? 'lock_open' : 'block'"
                                :color="isUserBlocked(user) ? 'positive' : 'negative'"
                                flat
                                round
                                @click="openBlockModal(user)"
                            >
                                <q-tooltip>
                                    {{
                                        isUserBlocked(user)
                                            ? "Débloquer l'utilisateur"
                                            : "Bloquer l'utilisateur"
                                    }}
                                </q-tooltip>
                            </q-btn>
                        </q-item-section>
                    </q-item>
                </q-list>

                <!-- Pagination -->
                <q-card-section v-if="pagination.total > 0" class="row justify-center">
                    <q-pagination
                        v-model="pagination.page"
                        :max="Math.ceil(pagination.total / pagination.pageSize)"
                        :max-pages="5"
                        @update:model-value="loadUsers"
                    />
                </q-card-section>

                <q-card-section v-if="users.length === 0 && !loading" class="text-center text-grey">
                    Aucun utilisateur trouvé
                </q-card-section>
            </q-card>
        </div>

        <q-dialog v-model="blockDialog.show">
            <q-card>
                <q-card-section>
                    <div class="text-h6">
                        {{
                            blockDialog.user && isUserBlocked(blockDialog.user)
                                ? 'Débloquer'
                                : 'Bloquer'
                        }}
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
                        :color="
                            blockDialog.user && isUserBlocked(blockDialog.user)
                                ? 'positive'
                                : 'negative'
                        "
                        @click="confirmBlock"
                    />
                </q-card-actions>
            </q-card>
        </q-dialog>
    </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore, type AdminUserView } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const users = ref<AdminUserView[]>([])
const loading = ref(false)
const errorMessage = ref('')
const searchQuery = ref('')

const pagination = reactive({
    page: 1,
    pageSize: 10,
    total: 0,
})

const blockDialog = reactive({
    show: false,
    user: null as AdminUserView | null,
})

async function loadUsers() {
    loading.value = true
    errorMessage.value = ''

    const params: { page: number; pageSize: number; search?: string } = {
        page: pagination.page,
        pageSize: pagination.pageSize,
    }
    if (searchQuery.value) {
        params.search = searchQuery.value
    }

    const result = await userStore.fetchAllUsers(params)

    if (result) {
        users.value = result.users
        pagination.total = result.total
    } else {
        errorMessage.value = 'Erreur lors du chargement des utilisateurs'
        users.value = []
        pagination.total = 0
    }

    loading.value = false
}

onMounted(() => {
    void loadUsers()
})

function isUserBlocked(user: AdminUserView): boolean {
    return user.blockedAt !== null
}

function openBlockModal(user: AdminUserView) {
    blockDialog.user = user
    blockDialog.show = true
}

async function confirmBlock() {
    if (!blockDialog.user) return

    const updatedUser = await userStore.toggleBlockUser(
        blockDialog.user.id,
        !isUserBlocked(blockDialog.user)
    )
    if (updatedUser) {
        const index = users.value.findIndex((u) => u.id === blockDialog.user!.id)
        if (index !== -1) {
            users.value[index] = updatedUser
        }
    }
    blockDialog.show = false
    blockDialog.user = null
}

function goToNewUser() {
    void router.push('/admin/create')
}
</script>
