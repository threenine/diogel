<script lang="ts" setup>
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

import useAccountStore from '../stores/account-store';
import ProfileView from '../components/ProfileView.vue';
import { useActiveTab } from '../composables/useActiveTab';
import { useVault } from '../composables/useVault';

defineOptions({ name: 'SidebarHome' });

const { t } = useI18n();
const accountStore = useAccountStore();
const { activeOrigin } = useActiveTab();
const { handleLock } = useVault();

const activeStoredKey = computed(() => {
  const activeAlias = accountStore.activeKey;
  if (!activeAlias) return undefined;
  return Array.from(accountStore.storedKeys).find((key) => key.alias === activeAlias);
});

function openInTab(path: string): void {
  const url = chrome.runtime.getURL(`www/index.html#${path}`);
  void chrome.tabs.create({ url });
}

onMounted(async () => {
  await accountStore.getKeys();
});
</script>

<template>
  <q-page class="sidebar-home">
    <!--
      Idle view. The unlock view and the request views take precedence over this body when they
      exist; those regions belong to #114 and #115 (specification section 3).
    -->
    <section v-if="activeOrigin" class="sidebar-home__context" :aria-label="t('sidebar.activeSite.ariaLabel')">
      <div class="sidebar-home__context-label">{{ t('sidebar.activeSite.label') }}</div>
      <div class="sidebar-home__context-origin">{{ activeOrigin }}</div>
    </section>

    <div v-if="activeStoredKey" class="sidebar-home__account">
      <ProfileView :stored-key="activeStoredKey" />
      <q-btn
        flat
        dense
        no-caps
        icon="lock"
        class="sidebar-home__lock"
        :label="t('navigation.lock.label')"
        @click="handleLock"
      />
    </div>

    <div v-else class="sidebar-home__empty">
      <q-icon color="grey-5" name="account_circle" size="3em" />
      <div class="text-subtitle1 text-grey-7 q-mt-sm">{{ t('account.noActiveAccount') }}</div>
      <p class="text-grey-6">{{ t('account.noActiveAccountDesc') }}</p>
      <q-btn
        no-caps
        class="diogel-btn-primary"
        :label="t('sidebar.links.keys')"
        @click="openInTab('/keys')"
      />
    </div>
  </q-page>
</template>

<style scoped>
.sidebar-home {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  min-width: 0;
}

.sidebar-home__context {
  padding: 8px 10px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  min-width: 0;
}

.sidebar-home__context-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted, #888);
}

/* Origins can be long and must never force the panel to scroll sideways. */
.sidebar-home__context-origin {
  font-weight: 600;
  overflow-wrap: anywhere;
}

.sidebar-home__account {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.sidebar-home__lock {
  align-self: flex-start;
}

.sidebar-home__empty {
  text-align: center;
  padding: 24px 8px;
}
</style>
