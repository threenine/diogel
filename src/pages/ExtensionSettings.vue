<script lang="ts" setup>
import ThemeSwitch from 'components/ThemeSwitch.vue';
</script>

<template>
  <q-page class="row items-center justify-evenly">
    <div class="q-pa-lg-lg">
      <q-list>
        <q-item v-ripple tag="label">
          <q-item-section>
            <q-item-label>Enable Dark theme</q-item-label>
          </q-item-section>
          <q-item-section avatar>
            <theme-switch />
          </q-item-section>
        </q-item>
      </q-list>
    </div>
  </q-page>
</template>

<style lang="sass">
.settings-row-equal-width
  .row > div
    background: rgba(#999,.15)
</style>
