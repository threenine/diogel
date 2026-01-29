<script lang="ts" setup>
import AccountDropdown from 'components/AccountDropdown/Index.vue';

function openInTab(path: string) {
  const url = chrome.runtime.getURL(`www/index.html#${path}`);
  void chrome.tabs.create({ url });
}
</script>

<template>
  <q-header elevated>
    <q-toolbar>
      <div class="q-pa-lg-lg">
        <q-btn dense flat icon="menu" round>
          <q-menu anchor="bottom left" self="top left">
            <q-list style="max-width: 300px">
              <q-item v-ripple clickable @click="openInTab('/profile')">
                <q-item-section avatar>
                  <q-icon name="person" size="sm" />
                </q-item-section>
                <q-item-section>Profile</q-item-section>
              </q-item>
              <q-item v-ripple clickable @click="openInTab('/settings')">
                <q-item-section avatar>
                  <q-icon name="settings" size="sm" />
                </q-item-section>
                <q-item-section> Extension Settings </q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
        <q-img src="/images/diogel-header.png" style="width: 200px; height: 45px" />
      </div>
      <q-space />
      <div class="q-pa-lg-lg"><account-dropdown /></div>
    </q-toolbar>
  </q-header>
</template>

<style scoped></style>
