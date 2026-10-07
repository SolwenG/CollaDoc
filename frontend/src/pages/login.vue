<template>
  <AuthCard title="Connexion">
    <p>Formulaire de connexion à venir.</p>
    <div>
      Pas encore de compte ?
      <router-link to="/register">Créer un compte</router-link>
    </div>
  </AuthCard>
</template>

<script setup lang="ts">
import AuthCard from '@/components/AuthCard.vue';
</script>
