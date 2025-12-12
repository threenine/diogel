<script lang="ts" setup>
import ThemeSwitch from 'components/ThemeSwitch.vue';
</script>

<template>
  <q-page>
    <div class="settings-container">
      <div class="settings-form shadow-0 rounded-borders">
        <div class="q-pa-md">
          <q-list>
            <q-item v-ripple tag="label">
              <q-item-section>
                <q-item-label>Enable Dark theme</q-item-label>
                <q-item-label caption lines="2"
                  >Secondary line text. Lorem ipsum dolor sit amet, consectetur adipiscit
                  elit.</q-item-label
                >
              </q-item-section>
              <q-item-section side top>
                <theme-switch />
              </q-item-section>
            </q-item>
          </q-list>
        </div>
      </div>
    </div>
  </q-page>
</template>
<style scoped></style>
