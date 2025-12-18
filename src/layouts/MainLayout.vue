<template>
  <q-layout>
    <q-header elevated>
      <q-toolbar>
        <q-btn dense flat icon="menu" round>
          <q-menu anchor="bottom left" self="top left">
            <q-list style="min-width: 160px">
              <q-item v-ripple clickable to="/">
                <q-item-section>Home</q-item-section>
              </q-item>
              <q-item v-ripple :to="{ name: 'settings' }" clickable>
                <q-item-section avatar>
                  <q-icon name="settings" size="sm" />
                </q-item-section>
                <q-item-section> Extension Settings </q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
        <q-space />
        <account-dropdown />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import AccountDropdown from 'components/AccountDropdown/Index.vue';
</script>
