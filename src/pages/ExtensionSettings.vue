<script lang="ts" setup>
import ThemeSwitch from 'components/ThemeSwitch/Index.vue';
</script>

<template>
  <q-page>
    <div class="settings-container">
      <div class="shadow-0">
        <q-toolbar>
          <q-toolbar-title>General</q-toolbar-title>
        </q-toolbar>
        <div class="q-pa-lg-lg full-width settings-form rounded-borders">
          <q-list>
            <q-item v-ripple tag="label">
              <q-item-section>
                <q-item-label>Theme</q-item-label>
                <q-item-label caption lines="2">Use light or dark mode</q-item-label>
              </q-item-section>
              <q-item-section side top>
                <theme-switch size="xl" />
              </q-item-section>
            </q-item>
          </q-list>
        </div>
      </div>
    </div>
  </q-page>
</template>
<style scoped></style>
