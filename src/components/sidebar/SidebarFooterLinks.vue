<script lang="ts" setup>
import { useI18n } from 'vue-i18n';

defineOptions({ name: 'SidebarFooterLinks' });

const { t } = useI18n();

/**
 * Management surfaces stay full-tab; the panel links out to them rather than hosting them.
 */
function openInTab(path: string): void {
  const url = chrome.runtime.getURL(`www/index.html#${path}`);
  void chrome.tabs.create({ url });
}

const links = [
  { id: 'dashboard', icon: 'dashboard', labelKey: 'sidebar.links.dashboard', path: '/dashboard' },
  { id: 'keys', icon: 'key', labelKey: 'sidebar.links.keys', path: '/keys' },
  { id: 'event-history', icon: 'history', labelKey: 'sidebar.links.eventHistory', path: '/event-history' },
  { id: 'settings', icon: 'settings', labelKey: 'sidebar.links.settings', path: '/settings' },
] as const;
</script>

<template>
  <nav class="sidebar-footer" :aria-label="t('sidebar.links.ariaLabel')">
    <q-btn
      v-for="link in links"
      :key="link.id"
      flat
      dense
      no-caps
      class="sidebar-footer__link"
      :icon="link.icon"
      :label="t(link.labelKey)"
      @click="openInTab(link.path)"
    />
  </nav>
</template>

<style scoped>
.sidebar-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px 12px;
  border-top: 1px solid var(--header-border);
  background: var(--header-bg);
  flex-shrink: 0;
}

.sidebar-footer__link {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 0.75rem;
}
</style>
