<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <q-page class="flex flex-center q-pa-md">
        <q-card class="auth-card">
          <q-card-section>
            <div class="text-h5">CollaDoc</div>
            <div class="text-subtitle1">{{ title }}</div>
          </q-card-section>
          <q-card-section>
            <slot />
          </q-card-section>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
defineProps<{ title: string }>();
</script>

<style scoped>
.auth-card {
  width: 100%;
  max-width: 400px;
}
</style>
