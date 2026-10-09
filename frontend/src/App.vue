<template>
    <q-layout view="lHh Lpr lFf">
        <q-header elevated>
            <q-toolbar>
                <q-btn
                    v-if="auth.isLoggedIn"
                    flat
                    dense
                    round
                    icon="menu"
                    aria-label="Menu"
                    @click="toggleLeftDrawer"
                />
                <q-toolbar-title>
                    <router-link to="/">CollaDoc</router-link>
                </q-toolbar-title>

                <div v-if="auth.user" class="row items-center q-gutter-sm">
                    <span>{{ auth.user.displayName }}</span>
                    <q-btn
                        flat
                        dense
                        round
                        icon="logout"
                        aria-label="Se déconnecter"
                        @click="onLogout"
                    />
                </div>
            </q-toolbar>
        </q-header>

        <q-drawer v-if="auth.isLoggedIn" v-model="leftDrawerOpen" bordered>
            <q-item to="/profile">
                <q-item-section avatar>
                    <q-icon name="person" />
                </q-item-section>
                <q-item-section>
                    <q-item-label>Mon Profil</q-item-label>
                </q-item-section>
            </q-item>
            <q-item v-if="auth.isAdmin" to="/admin">
                <q-item-section avatar>
                    <q-icon name="admin_panel_settings" />
                </q-item-section>
                <q-item-section>
                    <q-item-label>Admin</q-item-label>
                </q-item-section>
            </q-item>
        </q-drawer>

        <q-page-container>
            <router-view />
        </q-page-container>
    </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const leftDrawerOpen = ref(false)

function toggleLeftDrawer() {
    leftDrawerOpen.value = !leftDrawerOpen.value
}

const auth = useAuthStore()
const router = useRouter()

async function onLogout() {
    await auth.logout()
    await router.push('/login')
}
</script>
