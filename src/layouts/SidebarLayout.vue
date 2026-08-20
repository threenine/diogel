<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import DiogelLogo from 'components/DiogelLogo/Index.vue';
import SidebarFooterLinks from 'components/sidebar/SidebarFooterLinks.vue';
import { useApprovalQueue } from 'src/composables/useApprovalQueue';
import { useVault } from 'src/composables/useVault';
import useVaultStore from 'src/stores/vault-store';

const { t } = useI18n();
const vaultStore = useVaultStore();
const { handleLock } = useVault();

// Shared queue state, so this count and the request the page is showing can never disagree.
const { pendingCount } = useApprovalQueue();

const hasPending = computed(() => pendingCount.value > 0);

/**
 * The badge carries the number visually; this is what a screen reader announces instead (NFR-4).
 */
const pendingLabel = computed(() =>
  t('sidebar.header.pending.ariaLabel', { count: pendingCount.value }, pendingCount.value),
);
</script>

<template>
  <q-layout class="sidebar-root" view="hHh Lpr lFf">
    <header class="sidebar-header" :aria-label="t('sidebar.header.ariaLabel')">
      <div class="sidebar-brand">
        <DiogelLogo size="md" />
        <span class="sidebar-brand__name">Diogel</span>
      </div>

      <div class="sidebar-header__actions">
        <!--
          The account switcher named in specification §3 belongs here. It is deferred to #116,
          which owns site-to-account binding and therefore decides what switching means for an
          origin that is already bound to an account.
        -->

        <q-badge
          v-if="hasPending"
          class="sidebar-header__pending"
          aria-hidden="true"
          rounded
        >
          {{ pendingCount }}
        </q-badge>

        <!--
          Polite, never assertive: a request arriving must not interrupt what the user is reading
          in the panel body (NFR-4).
        -->
        <span class="sidebar-header__sr-only" role="status" aria-live="polite">
          {{ pendingLabel }}
        </span>

        <q-btn
          v-if="vaultStore.isUnlocked"
          flat
          dense
          round
          icon="lock"
          class="sidebar-header__lock"
          :aria-label="t('navigation.lock.caption')"
          :title="t('navigation.lock.caption')"
          @click="handleLock"
        />
      </div>
    </header>

    <q-page-container class="sidebar-body diogel-scrollbar">
      <router-view />
    </q-page-container>

    <SidebarFooterLinks />
  </q-layout>
</template>

<style scoped>
/*
 * The panel is a single narrow column. Width is owned by the browser, so the layout is fluid
 * from the 320px floor upward and never scrolls horizontally (NFR-11, NFR-12).
 */
.sidebar-root {
  display: flex;
  flex-direction: column;
  min-width: 0;
  width: 100%;
  height: 100vh;
  background: var(--page-bg);
  overflow-x: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 16px;
  background: var(--header-bg);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.sidebar-brand__name {
  font-weight: 600;
  font-size: 1rem;
  color: var(--text-color);
  letter-spacing: -0.0125em;
}

/* Actions keep their width so the brand is what gives way when the panel is narrow. */
.sidebar-header__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.sidebar-header__pending {
  background: var(--q-warning, #f2c037);
  color: #0b1220;
  font-weight: 700;
  font-size: 0.7rem;
  min-width: 20px;
  justify-content: center;
}

.sidebar-header__sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.sidebar-body {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
}
</style>
