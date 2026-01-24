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
          <q-tab icon="mail" label="Mails" name="mails" />
          <q-tab icon="alarm" label="Alarms" name="alarms" />
          <q-tab icon="movie" label="Movies" name="movies" />
          <q-tab icon="photo" label="Photos" name="photos" />
        </q-tabs>

        <q-separator />

        <q-tab-panels v-model="tab" animated>
          <q-tab-panel name="mails">
            <div class="text-h6">Mails</div>
            Lorem ipsum dolor sit amet consectetur adipisicing elit.
          </q-tab-panel>

          <q-tab-panel name="alarms">
            <div class="text-h6">Alarms</div>
            Lorem ipsum dolor sit amet consectetur adipisicing elit.
          </q-tab-panel>

          <q-tab-panel name="movies">
            <div class="text-h6">Movies</div>
            Lorem ipsum dolor sit amet consectetur adipisicing elit.
          </q-tab-panel>

          <q-tab-panel name="Keys">
            <div class="text-h6">Photos</div>

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
