<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <q-page class="flex flex-center q-pa-md">
        <q-card class="auth-card">
          <q-card-section>
            <div class="text-h5">CollaDoc</div>
            <div class="text-subtitle1">Connexion</div>
          </q-card-section>
          <q-card-section>
            <p>Formulaire de connexion à venir.</p>
            <div>
              Pas encore de compte ?
              <router-link to="/register">Créer un compte</router-link>
            </div>
          </q-card-section>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<style scoped>
.auth-card {
  width: 100%;
  max-width: 400px;
}
</style>
