<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <q-page class="flex flex-center q-pa-md">
        <q-card class="auth-card">
          <q-card-section>
            <div class="text-h5">CollaDoc</div>
            <div class="text-subtitle1">Créer un compte</div>
          </q-card-section>
          <q-card-section>
            <q-form class="q-gutter-y-md" @submit="onSubmit">
              <q-input
                v-model="username"
                label="Identifiant"
                outlined
                lazy-rules
                :rules="[required, usernameFormat]"
              />
              <q-input
                v-model="displayName"
                label="Nom d'affichage"
                outlined
                lazy-rules
                :rules="[required]"
              />
              <q-input
                v-model="password"
                label="Mot de passe"
                outlined
                type="password"
                lazy-rules
                :rules="[required, passwordLength, strongEnough]"
              />
              <div v-if="password">
                <q-linear-progress
                  :value="(strength.score + 1) / 5"
                  :color="strengthColors[strength.score]"
                />
                <div class="text-caption">{{ strengthLabels[strength.score] }}</div>
              </div>
              <q-input
                v-model="confirmPassword"
                label="Confirmer le mot de passe"
                outlined
                type="password"
                lazy-rules
                :rules="[required, samePassword]"
              />

              <q-btn type="submit" color="primary" label="S'inscrire" />
            </q-form>
          </q-card-section>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { ZxcvbnFactory } from '@zxcvbn-ts/core';
import * as zxcvbnCommon from '@zxcvbn-ts/language-common';
import * as zxcvbnFr from '@zxcvbn-ts/language-fr';

const zxcvbn = new ZxcvbnFactory({
  translations: zxcvbnFr.translations,
  graphs: zxcvbnCommon.adjacencyGraphs,
  dictionary: {
    ...zxcvbnCommon.dictionary,
    ...zxcvbnFr.dictionary,
  },
});
const PASSWORD_MIN_LENGTH = 8;

const required = (val: string) => !!val || 'Ce champ est obligatoire';

const usernameFormat = (val: string) =>
  /^[a-zA-Z0-9._-]+$/.test(val) || 'Lettres, chiffres, point, tiret et underscore uniquement';

const passwordLength = (val: string) =>
  val.length >= PASSWORD_MIN_LENGTH || `${PASSWORD_MIN_LENGTH} caractères minimum`;

const samePassword = (val: string) =>
  val === password.value || 'Les mots de passe ne correspondent pas';

const username = ref('');
const displayName = ref('');
const password = ref('');
const confirmPassword = ref('');
const MIN_SCORE = 3;
const strengthLabels = ['Très faible', 'Faible', 'Moyen', 'Bon', 'Excellent'];
const strengthColors = ['negative', 'negative', 'warning', 'positive', 'positive'];

const strength = computed(() => zxcvbn.check(password.value));

const strongEnough = () =>
  strength.value.score >= MIN_SCORE || 'Mot de passe trop facile à deviner';

function onSubmit() {
  console.log('Form submitted:', {
    username: username.value,
    displayName: displayName.value,
    password: password.value,
  });
}
</script>

<style scoped>
.auth-card {
  width: 100%;
  max-width: 400px;
}
</style>
