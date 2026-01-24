<template>
  <q-page class="flex flex-center">
    <div class="q-pa-md full-width" style="max-width: 600px">
      <q-card>
        <q-tabs
          v-model="tab"
          active-color="primary"
          align="justify"
          class="text-grey"
          dense
          indicator-color="primary"
          narrow-indicator
        >
          <q-tab icon="account_circle" label="Profile" name="profile" />
          <q-tab icon="image" label="Images" name="images" />
          <q-tab icon="mediation" label="Relays" name="relays" />
          <q-tab icon="key" label="Key" name="key" />
        </q-tabs>

        <q-separator />

        <q-tab-panels v-model="tab" animated>
          <q-tab-panel name="profile">
            <div class="text-h6">Cunt</div>
            Lorem ipsum dolor sit amet consectetur adipisicing elit.
          </q-tab-panel>

          <q-tab-panel name="images">
            <div class="text-h6">Alarms</div>
            Lorem ipsum dolor sit amet consectetur adipisicing elit.
          </q-tab-panel>

          <q-tab-panel name="relays">
            <div class="text-h6">Movies</div>
            Lorem ipsum dolor sit amet consectetur adipisicing elit.
          </q-tab-panel>

          <q-tab-panel name="key">
            <div class="text-h6">GARY</div>
          </q-tab-panel>
        </q-tab-panels>
      </q-card>
    </div>
  </q-page>
</template>

<script lang="ts" setup>
import { ref } from 'vue';

const tab = ref('mails');
</script>
